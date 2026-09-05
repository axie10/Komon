// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Komon Pot
 * @author Axie
 * @notice A decentralized shared pot for group expenses.
 * @dev Each Pot instance is deployed by KomonFactory. Members contribute equally,
 *      propose expenses, vote with 2/3 majority, and funds are released automatically.
 */
contract Pot is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    //  Enums
    // ──────────────────────────────────────────────

    /// @notice Lifecycle states of the pot
    enum PotState {
        FUNDING, // Waiting for all members to contribute
        ACTIVE, // All contributed — proposals and voting enabled
        CLOSED, // Pot ended normally — refunds available
        CANCELLED // Deadline passed without full funding — refunds available
    }

    /// @notice Possible states of a spending proposal
    enum ProposalState {
        ACTIVE, // Open for voting
        APPROVED, // 2/3 voted in favor — ready to execute
        EXECUTED, // Funds sent
        REJECTED // Did not reach 2/3 majority
    }

    // ──────────────────────────────────────────────
    //  Structs
    // ──────────────────────────────────────────────

    /// @notice Represents a spending proposal within the pot
    struct Proposal {
        uint256 id;
        address proposer;
        address recipient; // Who receives the funds
        uint256 amount;
        string description;
        string tag; // Category: food, transport, accommodation, etc.
        uint256 votesFor;
        uint256 votesAgainst;
        ProposalState state;
        mapping(address => bool) hasVoted;
    }

    // ──────────────────────────────────────────────
    //  State Variables
    // ──────────────────────────────────────────────

    // --- Config (set once at creation, never changes) ---
    address public immutable creator;
    IERC20 public immutable token; // address(0) if pot uses ETH
    uint256 public immutable contributionAmount;
    uint256 public immutable deadline;
    string public name;
    uint256 public refundPerMember;

    // --- Membership ---
    address[] public members;
    mapping(address => bool) public isMember;
    mapping(address => bool) public hasContributed;
    uint256 public contributionsReceived;

    // --- Pot state ---
    PotState public state;
    uint256 public totalFunds;

    // --- Proposals ---
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    // --- Emergency exit ---
    mapping(address => bool) public hasVotedEmergency;
    uint256 public emergencyVotes;

    // --- Refunds ---
    mapping(address => bool) public hasClaimedRefund;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event ContributionReceived(address indexed member, uint256 amount);
    event PotActivated(uint256 totalFunds);
    event PotCancelled();
    event PotClosed();

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address recipient,
        uint256 amount,
        string description,
        string tag
    );

    event VoteCast(uint256 indexed proposalId, address indexed voter, bool inFavor);

    event ProposalExecuted(uint256 indexed proposalId, address indexed recipient, uint256 amount, string tag);

    event ProposalRejected(uint256 indexed proposalId);
    event EmergencyExitVote(address indexed voter);
    event EmergencyExitTriggered();
    event RefundClaimed(address indexed member, uint256 amount);

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    error NotMember();
    error AlreadyContributed();
    error IncorrectAmount();
    error WrongState(PotState expected, PotState actual);
    error DeadlineNotReached();
    error DeadlineReached();
    error ProposalNotActive();
    error AlreadyVoted();
    error NotEnoughVotes();
    error InsufficientFunds();
    error AlreadyVotedEmergency();
    error AlreadyClaimed();
    error TransferFailed();

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier onlyMember() {
        if (!isMember[msg.sender]) revert NotMember();
        _;
    }

    modifier inState(PotState _expected) {
        if (state != _expected) revert WrongState(_expected, state);
        _;
    }

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    /**
     * @notice Creates a new pot. Called by KomonFactory.
     * @param _name         Human-readable name for the pot (e.g. "Trip to Berlin")
     * @param _token        ERC-20 token address, or address(0) for ETH
     * @param _members      Array of member addresses
     * @param _amount       Contribution amount per member
     * @param _deadline     Timestamp — contributions must be in before this
     */
    constructor(
        string memory _name,
        address _token,
        address[] memory _members,
        uint256 _amount,
        uint256 _deadline,
        address _creator
    ) {
        require(_members.length >= 2, "Pot: need at least 2 members");
        require(_amount > 0, "Pot: amount must be greater than 0");
        require(_deadline > block.timestamp, "Pot: deadline must be in the future");

        name = _name;
        creator = msg.sender;
        token = IERC20(_token);
        contributionAmount = _amount;
        deadline = _deadline;
        creator = _creator;
        state = PotState.FUNDING;

        for (uint256 i = 0; i < _members.length; i++) {
            require(_members[i] != address(0), "Pot: invalid member address");
            require(!isMember[_members[i]], "Pot: duplicate member");
            members.push(_members[i]);
            isMember[_members[i]] = true;
        }
    }

    // ──────────────────────────────────────────────
    //  Contributions
    // ──────────────────────────────────────────────

    /**
     * @notice Deposit your share into the pot.
     * @dev For ETH pots, send exact `contributionAmount` as msg.value.
     *      For ERC-20 pots, approve this contract first, then call with msg.value = 0.
     *      When all members contribute, the pot auto-transitions to ACTIVE.
     */
    function contribute() external payable onlyMember inState(PotState.FUNDING) {
        if (block.timestamp >= deadline) revert DeadlineReached();
        if (hasContributed[msg.sender]) revert AlreadyContributed();

        if (_isETH()) {
            if (msg.value != contributionAmount) revert IncorrectAmount();
        } else {
            if (msg.value != 0) revert IncorrectAmount();
            token.safeTransferFrom(msg.sender, address(this), contributionAmount);
        }

        // Effects
        hasContributed[msg.sender] = true;
        contributionsReceived++;
        totalFunds += contributionAmount;

        emit ContributionReceived(msg.sender, contributionAmount);

        // Auto-activate when all members have contributed
        if (contributionsReceived == members.length) {
            state = PotState.ACTIVE;
            emit PotActivated(totalFunds);
        }
    }

    // ──────────────────────────────────────────────
    //  Proposals
    // ──────────────────────────────────────────────

    /**
     * @notice Propose an expense from the pot.
     * @param _recipient    Address that will receive the funds if approved
     * @param _amount       Amount to send
     * @param _description  What the expense is for
     * @param _tag          Category tag (food, transport, accommodation, etc.)
     * @return proposalId   The ID of the newly created proposal
     */
    function createProposal(address _recipient, uint256 _amount, string calldata _description, string calldata _tag)
        external
        onlyMember
        inState(PotState.ACTIVE)
        returns (uint256 proposalId)
    {
        require(_recipient != address(0), "Pot: invalid recipient");
        require(_amount > 0, "Pot: amount must be greater than 0");
        if (_amount > totalFunds) revert InsufficientFunds();

        proposalId = proposalCount;
        Proposal storage p = proposals[proposalId];

        p.id = proposalId;
        p.proposer = msg.sender;
        p.recipient = _recipient;
        p.amount = _amount;
        p.description = _description;
        p.tag = _tag;
        p.state = ProposalState.ACTIVE;

        proposalCount++;

        emit ProposalCreated(proposalId, msg.sender, _recipient, _amount, _description, _tag);
    }

    /**
     * @notice Vote on an active proposal.
     * @param _proposalId  ID of the proposal to vote on
     * @param _inFavor     true = approve, false = reject
     */
    function vote(uint256 _proposalId, bool _inFavor) external onlyMember inState(PotState.ACTIVE) {
        Proposal storage p = proposals[_proposalId];

        if (p.state != ProposalState.ACTIVE) revert ProposalNotActive();
        if (p.hasVoted[msg.sender]) revert AlreadyVoted();

        // Effects
        p.hasVoted[msg.sender] = true;

        if (_inFavor) {
            p.votesFor++;
        } else {
            p.votesAgainst++;
        }

        emit VoteCast(_proposalId, msg.sender, _inFavor);

        // Check if 2/3 majority reached → auto-approve
        if (_hasReachedQuorum(p.votesFor)) {
            p.state = ProposalState.APPROVED;
        }

        // Check if rejection is mathematically certain
        // (remaining votes can't reach 2/3 even if all vote in favor)
        uint256 totalVoted = p.votesFor + p.votesAgainst;
        uint256 remaining = members.length - totalVoted;
        if (!_hasReachedQuorum(p.votesFor + remaining)) {
            p.state = ProposalState.REJECTED;
            emit ProposalRejected(_proposalId);
        }
    }

    /**
     * @notice Execute an approved proposal, sending funds to the recipient.
     * @dev Anyone can call this once a proposal is approved — no reason to restrict it.
     *      Follows CEI: state change before transfer.
     * @param _proposalId  ID of the approved proposal
     */
    function executeProposal(uint256 _proposalId) external nonReentrant inState(PotState.ACTIVE) {
        Proposal storage p = proposals[_proposalId];

        if (p.state != ProposalState.APPROVED) revert NotEnoughVotes();
        if (p.amount > totalFunds) revert InsufficientFunds();

        // Effects (before interaction — CEI pattern)
        p.state = ProposalState.EXECUTED;
        totalFunds -= p.amount;

        // Interaction
        if (_isETH()) {
            (bool success,) = p.recipient.call{value: p.amount}("");
            if (!success) revert TransferFailed();
        } else {
            token.safeTransfer(p.recipient, p.amount);
        }

        emit ProposalExecuted(_proposalId, p.recipient, p.amount, p.tag);
    }

    // ──────────────────────────────────────────────
    //  Lifecycle
    // ──────────────────────────────────────────────

    /**
     * @notice Cancel the pot if the contribution deadline has passed
     *         and not all members contributed. Anyone can trigger this.
     */
    function cancelPot() external inState(PotState.FUNDING) {
        if (block.timestamp < deadline) revert DeadlineNotReached();

        state = PotState.CANCELLED;
        emit PotCancelled();
    }

    /**
     * @notice Vote to trigger an emergency exit.
     * @dev When 2/3 of members vote for emergency exit, the pot closes
     *      and remaining funds become available for proportional refund.
     */
    function emergencyExit() external onlyMember inState(PotState.ACTIVE) {
        if (hasVotedEmergency[msg.sender]) revert AlreadyVotedEmergency();

        hasVotedEmergency[msg.sender] = true;
        emergencyVotes++;

        emit EmergencyExitVote(msg.sender);

        if (_hasReachedQuorum(emergencyVotes)) {
            refundPerMember = totalFunds / members.length;
            state = PotState.CLOSED;
            emit EmergencyExitTriggered();
        }
    }

    /**
     * @notice Close the pot normally. Only the creator can do this.
     * @dev After closing, remaining funds are available via claimRefund().
     */
    function closePot() external inState(PotState.ACTIVE) {
        require(msg.sender == creator, "Pot: only creator can close");

        refundPerMember = totalFunds / members.length;
        state = PotState.CLOSED;
        emit PotClosed();
    }

    /**
     * @notice Claim your share of remaining funds.
     * @dev CANCELLED → refund exact contribution (only if you contributed).
     *      CLOSED    → refund proportional share of whatever is left.
     */
    function claimRefund() external onlyMember nonReentrant {
        if (state != PotState.CLOSED && state != PotState.CANCELLED) {
            revert WrongState(PotState.CLOSED, state);
        }
        if (hasClaimedRefund[msg.sender]) revert AlreadyClaimed();

        uint256 refundAmount;

        if (state == PotState.CANCELLED) {
            if (!hasContributed[msg.sender]) revert IncorrectAmount();
            refundAmount = contributionAmount;
        } else {
            refundAmount = refundPerMember;
        }

        if (refundAmount == 0) revert InsufficientFunds();

        // Effects (CEI)
        hasClaimedRefund[msg.sender] = true;
        totalFunds -= refundAmount;

        // Interaction
        if (_isETH()) {
            (bool success,) = payable(msg.sender).call{value: refundAmount}("");
            if (!success) revert TransferFailed();
        } else {
            token.safeTransfer(msg.sender, refundAmount);
        }

        emit RefundClaimed(msg.sender, refundAmount);
    }

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    /// @notice Returns the total number of members in the pot
    function getMemberCount() external view returns (uint256) {
        return members.length;
    }

    /// @notice Returns all member addresses
    function getMembers() external view returns (address[] memory) {
        return members;
    }

    /// @notice Returns proposal details (excluding the hasVoted mapping)
    function getProposal(uint256 _proposalId)
        external
        view
        returns (
            address proposer,
            address recipient,
            uint256 amount,
            string memory description,
            string memory tag,
            uint256 votesFor,
            uint256 votesAgainst,
            ProposalState proposalState
        )
    {
        Proposal storage p = proposals[_proposalId];
        return (p.proposer, p.recipient, p.amount, p.description, p.tag, p.votesFor, p.votesAgainst, p.state);
    }

    /// @notice Check if a member has voted on a specific proposal
    function hasVotedOnProposal(uint256 _proposalId, address _member) external view returns (bool) {
        return proposals[_proposalId].hasVoted[_member];
    }

    // ──────────────────────────────────────────────
    //  Internal Helpers
    // ──────────────────────────────────────────────

    /// @dev Returns true if the pot operates with native ETH
    function _isETH() internal view returns (bool) {
        return address(token) == address(0);
    }

    /// @dev Returns true if `_votes` meets the 2/3 qualified majority
    ///      Uses multiplication instead of division to avoid rounding issues
    function _hasReachedQuorum(uint256 _votes) internal view returns (bool) {
        return _votes * 3 >= members.length * 2;
    }
}
