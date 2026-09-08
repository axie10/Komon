// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

/**
 * @title IPot
 * @notice Interface for Komon Pot instances.
 * @dev Used by KomonFactory and any external contract that needs
 *      to interact with a Pot without importing the full implementation.
 *      Think of it like a TypeScript interface — defines the shape,
 *      not the logic.
 */
interface IPot {
    // ──────────────────────────────────────────────
    //  Enums (re-declared for interface consumers)
    // ──────────────────────────────────────────────

    enum PotState {
        FUNDING,
        ACTIVE,
        CLOSED,
        CANCELLED
    }

    enum ProposalState {
        ACTIVE,
        APPROVED,
        EXECUTED,
        REJECTED
    }

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
    //  Contributions
    // ──────────────────────────────────────────────

    function contribute() external payable;

    // ──────────────────────────────────────────────
    //  Proposals
    // ──────────────────────────────────────────────

    function createProposal(address _recipient, uint256 _amount, string calldata _description, string calldata _tag)
        external
        returns (uint256 proposalId);

    function vote(uint256 _proposalId, bool _inFavor) external;

    function executeProposal(uint256 _proposalId) external;

    // ──────────────────────────────────────────────
    //  Lifecycle
    // ──────────────────────────────────────────────

    function cancelPot() external;

    function emergencyExit() external;

    function closePot() external;

    function claimRefund() external;

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    function name() external view returns (string memory);

    function creator() external view returns (address);

    function contributionAmount() external view returns (uint256);

    function deadline() external view returns (uint256);

    function state() external view returns (PotState);

    function totalFunds() external view returns (uint256);

    function proposalCount() external view returns (uint256);

    function contributionsReceived() external view returns (uint256);

    function isMember(address _addr) external view returns (bool);

    function hasContributed(address _addr) external view returns (bool);

    function getMemberCount() external view returns (uint256);

    function getMembers() external view returns (address[] memory);

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
        );

    function hasVotedOnProposal(uint256 _proposalId, address _member) external view returns (bool);
    function hasVotedCancelOnProposal(uint256 _proposalId, address _member) external view returns (bool);
    function cancelProposal(uint256 _proposalId) external;
}
