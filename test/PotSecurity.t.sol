// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import {Test} from "forge-std/Test.sol";
import {Pot} from "../src/Pot.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {FeeOnTransferToken} from "./mocks/FeeOnTransferToken.sol";
import {HookToken, ITransferHook} from "./mocks/HookToken.sol";

// ──────────────────────────────────────────────
//  Attacker / helper contracts
// ──────────────────────────────────────────────

/**
 * @dev A pot member that tries to be credited twice for a single deposit by
 *      re-entering `contribute()` from inside the token's transfer hook.
 *      Records whether the reentrant call was rejected so the test can assert
 *      the guard fired instead of just seeing the whole tx revert.
 */
contract ReentrantMember is ITransferHook {
    Pot public pot;
    HookToken public token;

    bool public reentryAttempted;
    bool public reentryReverted;

    constructor(HookToken _token) {
        token = _token;
    }

    function setPot(Pot _pot) external {
        pot = _pot;
        token.approve(address(_pot), type(uint256).max);
    }

    function attack() external {
        pot.contribute();
    }

    /// @dev Called by HookToken mid-`transferFrom`, before the pot finishes bookkeeping
    function onTokenTransfer() external override {
        reentryAttempted = true;

        try pot.contribute() {
        // Reached only if the pot let us in twice
        }
        catch {
            reentryReverted = true;
        }
    }
}

/**
 * @dev Proposal recipient that re-enters `executeProposal` while receiving ETH,
 *      trying to get paid twice for one approved proposal.
 */
contract ReentrantRecipient {
    Pot public pot;
    uint256 public proposalId;

    bool public reentryAttempted;
    bool public reentryReverted;

    function arm(Pot _pot, uint256 _proposalId) external {
        pot = _pot;
        proposalId = _proposalId;
    }

    receive() external payable {
        if (reentryAttempted) return;
        reentryAttempted = true;

        try pot.executeProposal(proposalId) {
        // Reached only if the guard failed
        }
        catch {
            reentryReverted = true;
        }
    }
}

/**
 * @dev Member contract that re-enters `claimRefund` while being refunded,
 *      trying to drain more than its share.
 */
contract ReentrantClaimer {
    Pot public pot;

    bool public reentryAttempted;
    bool public reentryReverted;

    function setPot(Pot _pot) external {
        pot = _pot;
    }

    function claim() external {
        pot.claimRefund();
    }

    receive() external payable {
        if (reentryAttempted) return;
        reentryAttempted = true;

        try pot.claimRefund() {
        // Reached only if the guard failed
        }
        catch {
            reentryReverted = true;
        }
    }
}

/// @dev Recipient that refuses ETH — makes an approved proposal unexecutable
contract RevertingReceiver {
    receive() external payable {
        revert("I reject ETH");
    }
}

// ──────────────────────────────────────────────
//  Test suite
// ──────────────────────────────────────────────

contract PotSecurityTest is Test {
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");
    address public dave = makeAddr("dave");
    address public eve = makeAddr("eve");
    address public outsider = makeAddr("outsider");

    uint256 public constant CONTRIBUTION = 1 ether;
    uint256 public constant TOKEN_CONTRIBUTION = 100e6;
    uint256 public constant DEADLINE = 7 days;

    address[] public members;

    Pot public ethPot;

    function setUp() public {
        members = new address[](5);
        members[0] = alice;
        members[1] = bob;
        members[2] = charlie;
        members[3] = dave;
        members[4] = eve;

        ethPot = new Pot("Security Pot", address(0), members, CONTRIBUTION, block.timestamp + DEADLINE, address(this));

        for (uint256 i = 0; i < members.length; i++) {
            deal(members[i], 10 ether);
        }
    }

    // ──────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────

    function _fundETHPot() internal {
        for (uint256 i = 0; i < members.length; i++) {
            vm.prank(members[i]);
            ethPot.contribute{value: CONTRIBUTION}();
        }
    }

    /// @dev 4 of 5 members vote yes on a proposal → APPROVED
    function _approve(Pot pot, uint256 proposalId) internal {
        vm.prank(alice);
        pot.vote(proposalId, true);
        vm.prank(bob);
        pot.vote(proposalId, true);
        vm.prank(charlie);
        pot.vote(proposalId, true);
        vm.prank(dave);
        pot.vote(proposalId, true);
    }

    /// @dev 4 of 5 members vote to close → CLOSED
    function _closeByVote(Pot pot) internal {
        vm.prank(alice);
        pot.closePot();
        vm.prank(bob);
        pot.closePot();
        vm.prank(charlie);
        pot.closePot();
        vm.prank(dave);
        pot.closePot();
    }

    // ══════════════════════════════════════════════
    //  M-01 — REENTRANCY ON contribute()
    // ══════════════════════════════════════════════

    /// @dev A token hook must not let one member be credited twice for one deposit
    function test_Reentrancy_Contribute_IsBlocked() public {
        HookToken token = new HookToken();
        ReentrantMember attacker = new ReentrantMember(token);

        address[] memory hookMembers = new address[](3);
        hookMembers[0] = address(attacker);
        hookMembers[1] = bob;
        hookMembers[2] = charlie;

        Pot hookPot = new Pot(
            "Hook Pot", address(token), hookMembers, TOKEN_CONTRIBUTION, block.timestamp + DEADLINE, address(this)
        );

        attacker.setPot(hookPot);
        token.mint(address(attacker), 1000e6);
        token.setHookTarget(address(attacker));

        attacker.attack();

        // The hook fired and the reentrant contribute() was rejected
        assertTrue(attacker.reentryAttempted(), "hook never fired");
        assertTrue(attacker.reentryReverted(), "reentrant contribute was NOT blocked");

        // Exactly one contribution was credited
        assertEq(hookPot.contributionsReceived(), 1);
        assertEq(hookPot.totalFunds(), TOKEN_CONTRIBUTION);
        assertEq(hookPot.contributedAmount(address(attacker)), TOKEN_CONTRIBUTION);

        // And the pot was NOT prematurely activated (3 members, only 1 contributed)
        assertEq(uint256(hookPot.state()), uint256(Pot.PotState.FUNDING));
    }

    // ══════════════════════════════════════════════
    //  REENTRANCY ON executeProposal() / claimRefund()
    // ══════════════════════════════════════════════

    function test_Reentrancy_ExecuteProposal_IsBlocked() public {
        _fundETHPot();

        ReentrantRecipient attacker = new ReentrantRecipient();

        vm.prank(alice);
        uint256 proposalId = ethPot.createProposal(address(attacker), 1 ether, "Payout", "other");

        attacker.arm(ethPot, proposalId);
        _approve(ethPot, proposalId);

        uint256 potBalanceBefore = address(ethPot).balance;

        ethPot.executeProposal(proposalId);

        assertTrue(attacker.reentryAttempted(), "recipient callback never fired");
        assertTrue(attacker.reentryReverted(), "reentrant execute was NOT blocked");

        // Paid exactly once
        assertEq(address(attacker).balance, 1 ether);
        assertEq(address(ethPot).balance, potBalanceBefore - 1 ether);
        assertEq(ethPot.totalFunds(), 4 ether);
    }

    function test_Reentrancy_ClaimRefund_IsBlocked() public {
        ReentrantClaimer attacker = new ReentrantClaimer();
        deal(address(attacker), 10 ether);

        address[] memory claimMembers = new address[](3);
        claimMembers[0] = address(attacker);
        claimMembers[1] = bob;
        claimMembers[2] = charlie;

        Pot pot =
            new Pot("Claim Pot", address(0), claimMembers, CONTRIBUTION, block.timestamp + DEADLINE, address(this));
        attacker.setPot(pot);

        vm.prank(address(attacker));
        pot.contribute{value: CONTRIBUTION}();
        vm.prank(bob);
        pot.contribute{value: CONTRIBUTION}();
        vm.prank(charlie);
        pot.contribute{value: CONTRIBUTION}();

        // 2 of 3 votes reaches the 2/3 quorum
        vm.prank(bob);
        pot.closePot();
        vm.prank(charlie);
        pot.closePot();

        assertEq(uint256(pot.state()), uint256(Pot.PotState.CLOSED));

        uint256 balanceBefore = address(attacker).balance;
        attacker.claim();

        assertTrue(attacker.reentryAttempted(), "refund callback never fired");
        assertTrue(attacker.reentryReverted(), "reentrant claim was NOT blocked");

        // Refunded exactly one share
        assertEq(address(attacker).balance, balanceBefore + CONTRIBUTION);
        assertEq(address(pot).balance, 2 ether);
    }

    // ══════════════════════════════════════════════
    //  H-01 — FEE-ON-TRANSFER TOKEN ACCOUNTING
    // ══════════════════════════════════════════════

    /// @dev totalFunds must never claim more than the pot actually holds
    function test_FeeOnTransfer_AccountingMatchesRealBalance() public {
        (Pot pot, FeeOnTransferToken token) = _deployFeePot();

        for (uint256 i = 0; i < members.length; i++) {
            vm.prank(members[i]);
            pot.contribute();
        }

        // 2% fee → 98 credited per member, not the 100 that was pulled
        uint256 expectedPerMember = TOKEN_CONTRIBUTION - (TOKEN_CONTRIBUTION * 200) / 10_000;

        assertEq(pot.contributedAmount(alice), expectedPerMember);
        assertEq(pot.totalFunds(), expectedPerMember * 5);
        assertEq(pot.totalFunds(), token.balanceOf(address(pot)), "accounting exceeds real balance");
    }

    /// @dev Before the H-01 fix the last member's refund reverted for lack of funds
    function test_FeeOnTransfer_AllMembersCanClaimRefund() public {
        (Pot pot, FeeOnTransferToken token) = _deployFeePot();

        for (uint256 i = 0; i < members.length; i++) {
            vm.prank(members[i]);
            pot.contribute();
        }

        _closeByVote(pot);

        for (uint256 i = 0; i < members.length; i++) {
            vm.prank(members[i]);
            pot.claimRefund();
        }

        assertEq(pot.totalFunds(), 0);
        assertEq(token.balanceOf(address(pot)), 0, "funds stranded in pot");
    }

    /// @dev CANCELLED refunds must return what was credited, not the nominal amount
    function test_FeeOnTransfer_CancelledRefundUsesCreditedAmount() public {
        (Pot pot, FeeOnTransferToken token) = _deployFeePot();

        vm.prank(alice);
        pot.contribute();
        vm.prank(bob);
        pot.contribute();

        vm.warp(block.timestamp + DEADLINE + 1);
        pot.cancelPot();

        uint256 expectedPerMember = TOKEN_CONTRIBUTION - (TOKEN_CONTRIBUTION * 200) / 10_000;
        assertEq(pot.contributedAmount(alice), expectedPerMember);

        vm.prank(alice);
        pot.claimRefund();

        // Bob must still be able to claim — the pot never promised more than it holds
        vm.prank(bob);
        pot.claimRefund();

        assertEq(token.balanceOf(address(pot)), 0, "funds stranded in pot");
    }

    function _deployFeePot() internal returns (Pot pot, FeeOnTransferToken token) {
        token = new FeeOnTransferToken();

        pot = new Pot("Fee Pot", address(token), members, TOKEN_CONTRIBUTION, block.timestamp + DEADLINE, address(this));

        for (uint256 i = 0; i < members.length; i++) {
            token.mint(members[i], 1000e6);
            vm.prank(members[i]);
            token.approve(address(pot), type(uint256).max);
        }
    }

    // ══════════════════════════════════════════════
    //  M-04 — PHANTOM PROPOSALS
    // ══════════════════════════════════════════════

    function test_RevertWhen_VoteOnNonexistentProposal() public {
        _fundETHPot();

        vm.prank(alice);
        vm.expectRevert(Pot.ProposalDoesNotExist.selector);
        ethPot.vote(0, true);
    }

    function test_RevertWhen_VoteOnProposalIdPastTheEnd() public {
        _fundETHPot();

        vm.prank(alice);
        ethPot.createProposal(outsider, 0.5 ether, "Real proposal", "food");

        vm.prank(alice);
        vm.expectRevert(Pot.ProposalDoesNotExist.selector);
        ethPot.vote(1, true);
    }

    function test_RevertWhen_ExecuteNonexistentProposal() public {
        _fundETHPot();

        vm.expectRevert(Pot.ProposalDoesNotExist.selector);
        ethPot.executeProposal(42);
    }

    // ══════════════════════════════════════════════
    //  M-03 — CLOSE REQUIRES 2/3, NOT THE CREATOR
    // ══════════════════════════════════════════════

    function test_Creator_CannotCloseUnilaterally() public {
        _fundETHPot();

        // This contract is the pot's creator
        assertEq(ethPot.creator(), address(this));

        vm.expectRevert(Pot.NotMember.selector);
        ethPot.closePot();

        assertEq(uint256(ethPot.state()), uint256(Pot.PotState.ACTIVE));
    }

    function test_MinorityCloseVotes_CannotCloseThePot() public {
        _fundETHPot();

        vm.prank(alice);
        ethPot.closePot();
        vm.prank(bob);
        ethPot.closePot();
        vm.prank(charlie);
        ethPot.closePot();

        assertEq(ethPot.closeVotes(), 3);
        assertEq(uint256(ethPot.state()), uint256(Pot.PotState.ACTIVE));
        assertEq(ethPot.refundPerMember(), 0);
    }

    function test_ClosePot_EmitsCloseVote() public {
        _fundETHPot();

        vm.expectEmit(true, false, false, false);
        emit Pot.CloseVote(alice);

        vm.prank(alice);
        ethPot.closePot();

        assertEq(ethPot.closeVotes(), 1);
    }

    // ══════════════════════════════════════════════
    //  M-05 — STUCK PROPOSAL (known, still open)
    // ══════════════════════════════════════════════

    /// @dev Documents current behaviour: a recipient that rejects ETH makes an
    ///      approved proposal permanently unexecutable, but funds stay in the pot.
    function test_RevertingRecipient_LeavesProposalApprovedAndFundsIntact() public {
        _fundETHPot();

        RevertingReceiver bad = new RevertingReceiver();

        vm.prank(alice);
        uint256 proposalId = ethPot.createProposal(address(bad), 1 ether, "Unpayable", "other");
        _approve(ethPot, proposalId);

        vm.expectRevert(Pot.TransferFailed.selector);
        ethPot.executeProposal(proposalId);

        // State rolled back — proposal still APPROVED, funds untouched
        (,,,,,,, Pot.ProposalState proposalState) = ethPot.getProposal(proposalId);
        assertEq(uint256(proposalState), uint256(Pot.ProposalState.APPROVED));
        assertEq(ethPot.totalFunds(), 5 ether);

        // The pot can still spend the funds elsewhere
        vm.prank(alice);
        uint256 goodId = ethPot.createProposal(outsider, 1 ether, "Payable", "other");
        _approve(ethPot, goodId);
        ethPot.executeProposal(goodId);

        assertEq(outsider.balance, 1 ether);
    }

    // ══════════════════════════════════════════════
    //  INPUT VALIDATION EDGE CASES
    // ══════════════════════════════════════════════

    function test_RevertWhen_ProposalAmountIsZero() public {
        _fundETHPot();

        vm.prank(alice);
        vm.expectRevert("Pot: amount must be greater than 0");
        ethPot.createProposal(outsider, 0, "Nothing", "other");
    }

    function test_RevertWhen_ProposalRecipientIsZero() public {
        _fundETHPot();

        vm.prank(alice);
        vm.expectRevert("Pot: invalid recipient");
        ethPot.createProposal(address(0), 1 ether, "Void", "other");
    }

    function test_ProposalAmountEqualToTotalFunds_IsAllowed() public {
        _fundETHPot();

        vm.prank(alice);
        uint256 proposalId = ethPot.createProposal(outsider, 5 ether, "Everything", "other");
        _approve(ethPot, proposalId);
        ethPot.executeProposal(proposalId);

        assertEq(ethPot.totalFunds(), 0);
        assertEq(outsider.balance, 5 ether);
    }

    function test_RevertWhen_ClaimRefundWithNothingToClaim() public {
        _fundETHPot();

        // Spend the entire pot, then close it
        vm.prank(alice);
        uint256 proposalId = ethPot.createProposal(outsider, 5 ether, "Everything", "other");
        _approve(ethPot, proposalId);
        ethPot.executeProposal(proposalId);

        _closeByVote(ethPot);

        assertEq(ethPot.refundPerMember(), 0);

        vm.prank(alice);
        vm.expectRevert(Pot.InsufficientFunds.selector);
        ethPot.claimRefund();
    }

    function test_RevertWhen_ConstructorHasDuplicateMembers() public {
        address[] memory dupes = new address[](3);
        dupes[0] = alice;
        dupes[1] = bob;
        dupes[2] = alice;

        vm.expectRevert("Pot: duplicate member");
        new Pot("Dupes", address(0), dupes, CONTRIBUTION, block.timestamp + DEADLINE, address(this));
    }

    function test_RevertWhen_ConstructorHasZeroAddressMember() public {
        address[] memory bad = new address[](2);
        bad[0] = alice;
        bad[1] = address(0);

        vm.expectRevert("Pot: invalid member address");
        new Pot("Zero", address(0), bad, CONTRIBUTION, block.timestamp + DEADLINE, address(this));
    }

    // ══════════════════════════════════════════════
    //  L-01 — REFUND ROUNDING DUST (known, still open)
    // ══════════════════════════════════════════════

    /// @dev Documents that integer division leaves dust permanently in the pot
    function test_RefundDust_StaysLockedInPot() public {
        address[] memory three = new address[](3);
        three[0] = alice;
        three[1] = bob;
        three[2] = charlie;

        Pot pot = new Pot("Dust", address(0), three, CONTRIBUTION, block.timestamp + DEADLINE, address(this));

        for (uint256 i = 0; i < three.length; i++) {
            vm.prank(three[i]);
            pot.contribute{value: CONTRIBUTION}();
        }

        // Spend 1 wei so the remainder no longer divides evenly by 3
        vm.prank(alice);
        uint256 proposalId = pot.createProposal(outsider, 1, "Dust maker", "other");
        vm.prank(alice);
        pot.vote(proposalId, true);
        vm.prank(bob);
        pot.vote(proposalId, true);
        pot.executeProposal(proposalId);

        // 2 of 3 votes reaches the 2/3 quorum
        vm.prank(alice);
        pot.closePot();
        vm.prank(bob);
        pot.closePot();

        uint256 remaining = 3 ether - 1;
        assertEq(pot.refundPerMember(), remaining / 3);

        for (uint256 i = 0; i < three.length; i++) {
            vm.prank(three[i]);
            pot.claimRefund();
        }

        // 2 wei of dust is stranded — no sweep mechanism exists
        assertEq(address(pot).balance, remaining % 3);
        assertEq(address(pot).balance, 2);
    }

    // ══════════════════════════════════════════════
    //  QUORUM MATH — FUZZED ACROSS MEMBER COUNTS
    // ══════════════════════════════════════════════

    /// @dev Approval must require exactly ceil(2n/3) votes for any member count
    function testFuzz_QuorumThreshold(uint8 rawCount) public {
        uint256 n = bound(uint256(rawCount), 2, 30);

        address[] memory fuzzMembers = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            fuzzMembers[i] = address(uint160(1000 + i));
            deal(fuzzMembers[i], 10 ether);
        }

        Pot pot = new Pot("Fuzz", address(0), fuzzMembers, CONTRIBUTION, block.timestamp + DEADLINE, address(this));

        for (uint256 i = 0; i < n; i++) {
            vm.prank(fuzzMembers[i]);
            pot.contribute{value: CONTRIBUTION}();
        }

        vm.prank(fuzzMembers[0]);
        uint256 proposalId = pot.createProposal(outsider, 1 ether, "Fuzzed", "other");

        uint256 needed = (2 * n + 2) / 3; // ceil(2n/3)

        // One vote short of quorum → still ACTIVE
        for (uint256 i = 0; i < needed - 1; i++) {
            vm.prank(fuzzMembers[i]);
            pot.vote(proposalId, true);
        }

        (,,,,,,, Pot.ProposalState before) = pot.getProposal(proposalId);
        assertEq(uint256(before), uint256(Pot.ProposalState.ACTIVE), "approved too early");

        // The deciding vote → APPROVED
        vm.prank(fuzzMembers[needed - 1]);
        pot.vote(proposalId, true);

        (,,,,,,, Pot.ProposalState afterVote) = pot.getProposal(proposalId);
        assertEq(uint256(afterVote), uint256(Pot.ProposalState.APPROVED), "quorum not reached");
    }

    /// @dev Same threshold must govern closing the pot
    function testFuzz_CloseQuorumThreshold(uint8 rawCount) public {
        uint256 n = bound(uint256(rawCount), 2, 30);

        address[] memory fuzzMembers = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            fuzzMembers[i] = address(uint160(2000 + i));
            deal(fuzzMembers[i], 10 ether);
        }

        Pot pot = new Pot("FuzzClose", address(0), fuzzMembers, CONTRIBUTION, block.timestamp + DEADLINE, address(this));

        for (uint256 i = 0; i < n; i++) {
            vm.prank(fuzzMembers[i]);
            pot.contribute{value: CONTRIBUTION}();
        }

        uint256 needed = (2 * n + 2) / 3;

        for (uint256 i = 0; i < needed - 1; i++) {
            vm.prank(fuzzMembers[i]);
            pot.closePot();
        }

        assertEq(uint256(pot.state()), uint256(Pot.PotState.ACTIVE), "closed too early");

        vm.prank(fuzzMembers[needed - 1]);
        pot.closePot();

        assertEq(uint256(pot.state()), uint256(Pot.PotState.CLOSED), "close quorum not reached");
    }
}
