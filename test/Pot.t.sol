// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Test, console} from "forge-std/Test.sol";
import {Pot} from "../src/Pot.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract PotTest is Test {
    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    Pot public ethPot;
    Pot public usdcPot;
    MockUSDC public usdc;

    // Cast of characters — labeled for readable traces
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");
    address public dave = makeAddr("dave");
    address public eve = makeAddr("eve");
    address public outsider = makeAddr("outsider");

    uint256 public constant CONTRIBUTION = 1 ether;
    uint256 public constant USDC_CONTRIBUTION = 100e6; // 100 USDC (6 decimals)
    uint256 public constant DEADLINE = 7 days;

    address[] public members;

    // ──────────────────────────────────────────────
    //  Setup
    // ──────────────────────────────────────────────

    function setUp() public {
        members = new address[](5);
        members[0] = alice;
        members[1] = bob;
        members[2] = charlie;
        members[3] = dave;
        members[4] = eve;

        // Deploy ETH pot
        ethPot = new Pot("Trip to Berlin", address(0), members, CONTRIBUTION, block.timestamp + DEADLINE, address(this));

        // Deploy USDC mock and USDC pot
        usdc = new MockUSDC();

        usdcPot = new Pot(
            "Shared Apartment", address(usdc), members, USDC_CONTRIBUTION, block.timestamp + DEADLINE, address(this)
        );

        // Fund members with ETH and USDC
        for (uint256 i = 0; i < members.length; i++) {
            deal(members[i], 10 ether);
            usdc.mint(members[i], 1000e6);

            // Approve USDC pot to spend tokens
            vm.prank(members[i]);
            usdc.approve(address(usdcPot), type(uint256).max);
        }

        // Fund outsider for revert tests
        deal(outsider, 10 ether);
    }

    // ──────────────────────────────────────────────
    //  Helpers
    // ──────────────────────────────────────────────

    /// @dev All members contribute to the ETH pot → transitions to ACTIVE
    function _fundETHPot() internal {
        for (uint256 i = 0; i < members.length; i++) {
            vm.prank(members[i]);
            ethPot.contribute{value: CONTRIBUTION}();
        }
    }

    /// @dev All members contribute to the USDC pot → transitions to ACTIVE
    function _fundUSDCPot() internal {
        for (uint256 i = 0; i < members.length; i++) {
            vm.prank(members[i]);
            usdcPot.contribute();
        }
    }

    /// @dev Create a proposal and get 4 out of 5 votes (above 2/3 threshold)
    function _createAndApproveProposal(Pot pot) internal returns (uint256) {
        vm.prank(alice);
        uint256 proposalId = pot.createProposal(outsider, 0.5 ether, "Dinner at restaurant", "food");

        // 4 out of 5 vote yes → well above 2/3
        vm.prank(alice);
        pot.vote(proposalId, true);

        vm.prank(bob);
        pot.vote(proposalId, true);

        vm.prank(charlie);
        pot.vote(proposalId, true);

        vm.prank(dave);
        pot.vote(proposalId, true);

        return proposalId;
    }

    // ══════════════════════════════════════════════
    //  CONTRIBUTIONS
    // ══════════════════════════════════════════════

    function test_ContributeETH_Success() public {
        vm.prank(alice);
        ethPot.contribute{value: CONTRIBUTION}();

        assertTrue(ethPot.hasContributed(alice));
        assertEq(ethPot.contributionsReceived(), 1);
        assertEq(ethPot.totalFunds(), CONTRIBUTION);
    }

    function test_ContributeUSDC_Success() public {
        vm.prank(alice);
        usdcPot.contribute();

        assertTrue(usdcPot.hasContributed(alice));
        assertEq(usdcPot.contributionsReceived(), 1);
        assertEq(usdc.balanceOf(address(usdcPot)), USDC_CONTRIBUTION);
    }

    function test_ContributeETH_AutoActivates() public {
        _fundETHPot();

        assertEq(uint256(ethPot.state()), uint256(Pot.PotState.ACTIVE));
        assertEq(ethPot.totalFunds(), CONTRIBUTION * members.length);
    }

    function test_ContributeUSDC_AutoActivates() public {
        _fundUSDCPot();

        assertEq(uint256(usdcPot.state()), uint256(Pot.PotState.ACTIVE));
        assertEq(usdc.balanceOf(address(usdcPot)), USDC_CONTRIBUTION * members.length);
    }

    function test_RevertWhen_NonMemberContributes() public {
        vm.prank(outsider);
        vm.expectRevert(Pot.NotMember.selector);
        ethPot.contribute{value: CONTRIBUTION}();
    }

    function test_RevertWhen_DoubleContribution() public {
        vm.prank(alice);
        ethPot.contribute{value: CONTRIBUTION}();

        vm.prank(alice);
        vm.expectRevert(Pot.AlreadyContributed.selector);
        ethPot.contribute{value: CONTRIBUTION}();
    }

    function test_RevertWhen_WrongETHAmount() public {
        vm.prank(alice);
        vm.expectRevert(Pot.IncorrectAmount.selector);
        ethPot.contribute{value: 0.5 ether}();
    }

    function test_RevertWhen_SendingETHToUSDCPot() public {
        vm.prank(alice);
        vm.expectRevert(Pot.IncorrectAmount.selector);
        usdcPot.contribute{value: 1 ether}();
    }

    function test_RevertWhen_ContributeAfterDeadline() public {
        vm.warp(block.timestamp + DEADLINE + 1);

        vm.prank(alice);
        vm.expectRevert(Pot.DeadlineReached.selector);
        ethPot.contribute{value: CONTRIBUTION}();
    }

    function test_ContributeETH_EmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit Pot.ContributionReceived(alice, CONTRIBUTION);

        vm.prank(alice);
        ethPot.contribute{value: CONTRIBUTION}();
    }

    // ══════════════════════════════════════════════
    //  PROPOSALS
    // ══════════════════════════════════════════════

    function test_CreateProposal_Success() public {
        _fundETHPot();

        vm.prank(alice);
        uint256 proposalId = ethPot.createProposal(outsider, 0.5 ether, "Taxi to airport", "transport");

        assertEq(proposalId, 0);
        assertEq(ethPot.proposalCount(), 1);

        (
            address proposer,
            address recipient,
            uint256 amount,
            string memory description,
            string memory tag,,,
            Pot.ProposalState proposalState
        ) = ethPot.getProposal(0);

        assertEq(proposer, alice);
        assertEq(recipient, outsider);
        assertEq(amount, 0.5 ether);
        assertEq(description, "Taxi to airport");
        assertEq(tag, "transport");
        assertEq(uint256(proposalState), uint256(Pot.ProposalState.ACTIVE));
    }

    function test_RevertWhen_ProposalExceedsFunds() public {
        _fundETHPot();

        vm.prank(alice);
        vm.expectRevert(Pot.InsufficientFunds.selector);
        ethPot.createProposal(outsider, 100 ether, "Too much", "other");
    }

    function test_RevertWhen_NonMemberCreatesProposal() public {
        _fundETHPot();

        vm.prank(outsider);
        vm.expectRevert(Pot.NotMember.selector);
        ethPot.createProposal(outsider, 0.5 ether, "Nope", "other");
    }

    function test_RevertWhen_ProposalInFundingState() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Pot.WrongState.selector, Pot.PotState.ACTIVE, Pot.PotState.FUNDING));
        ethPot.createProposal(outsider, 0.5 ether, "Too early", "other");
    }

    // ══════════════════════════════════════════════
    //  VOTING
    // ══════════════════════════════════════════════

    function test_Vote_Success() public {
        _fundETHPot();

        vm.prank(alice);
        ethPot.createProposal(outsider, 0.5 ether, "Dinner", "food");

        vm.prank(alice);
        ethPot.vote(0, true);

        (,,,,, uint256 votesFor,,) = ethPot.getProposal(0);
        assertEq(votesFor, 1);
        assertTrue(ethPot.hasVotedOnProposal(0, alice));
    }

    function test_Vote_AutoApproves_AtTwoThirds() public {
        _fundETHPot();

        vm.prank(alice);
        ethPot.createProposal(outsider, 0.5 ether, "Dinner", "food");

        // 5 members → need 4 votes for 2/3 (4*3=12 >= 5*2=10)
        vm.prank(alice);
        ethPot.vote(0, true);

        vm.prank(bob);
        ethPot.vote(0, true);

        vm.prank(charlie);
        ethPot.vote(0, true);

        // Still ACTIVE after 3 votes (3*3=9 < 5*2=10)
        (,,,,,,, Pot.ProposalState stateBefore) = ethPot.getProposal(0);
        assertEq(uint256(stateBefore), uint256(Pot.ProposalState.ACTIVE));

        // 4th vote tips it over → APPROVED
        vm.prank(dave);
        ethPot.vote(0, true);

        (,,,,,,, Pot.ProposalState stateAfter) = ethPot.getProposal(0);
        assertEq(uint256(stateAfter), uint256(Pot.ProposalState.APPROVED));
    }

    function test_Vote_AutoRejects_WhenImpossible() public {
        _fundETHPot();

        vm.prank(alice);
        ethPot.createProposal(outsider, 0.5 ether, "Dinner", "food");

        // 2 vote against out of 5 → even if remaining 3 vote yes,
        // that's only 3 for (3*3=9 < 5*2=10) → can never reach 2/3
        vm.prank(alice);
        ethPot.vote(0, false);

        vm.prank(bob);
        ethPot.vote(0, false);

        (,,,,,,, Pot.ProposalState stateAfter) = ethPot.getProposal(0);
        assertEq(uint256(stateAfter), uint256(Pot.ProposalState.REJECTED));
    }

    function test_RevertWhen_DoubleVote() public {
        _fundETHPot();

        vm.prank(alice);
        ethPot.createProposal(outsider, 0.5 ether, "Dinner", "food");

        vm.prank(alice);
        ethPot.vote(0, true);

        vm.prank(alice);
        vm.expectRevert(Pot.AlreadyVoted.selector);
        ethPot.vote(0, true);
    }

    function test_RevertWhen_VoteOnNonActiveProposal() public {
        _fundETHPot();

        uint256 proposalId = _createAndApproveProposal(ethPot);

        // Proposal is APPROVED, not ACTIVE
        vm.prank(eve);
        vm.expectRevert(Pot.ProposalNotActive.selector);
        ethPot.vote(proposalId, true);
    }

    // ══════════════════════════════════════════════
    //  EXECUTION
    // ══════════════════════════════════════════════

    function test_ExecuteProposal_ETH_Success() public {
        _fundETHPot();
        uint256 proposalId = _createAndApproveProposal(ethPot);

        uint256 recipientBefore = outsider.balance;
        uint256 potFundsBefore = ethPot.totalFunds();

        ethPot.executeProposal(proposalId);

        // Verify recipient received ETH
        assertEq(outsider.balance, recipientBefore + 0.5 ether);

        // Verify pot funds decreased
        assertEq(ethPot.totalFunds(), potFundsBefore - 0.5 ether);

        // Verify proposal state is EXECUTED
        (,,,,,,, Pot.ProposalState proposalState) = ethPot.getProposal(proposalId);
        assertEq(uint256(proposalState), uint256(Pot.ProposalState.EXECUTED));
    }

    function test_ExecuteProposal_USDC_Success() public {
        _fundUSDCPot();

        vm.prank(alice);
        uint256 proposalId = usdcPot.createProposal(
            outsider,
            50e6, // 50 USDC
            "Groceries",
            "food"
        );

        vm.prank(alice);
        usdcPot.vote(proposalId, true);
        vm.prank(bob);
        usdcPot.vote(proposalId, true);
        vm.prank(charlie);
        usdcPot.vote(proposalId, true);
        vm.prank(dave);
        usdcPot.vote(proposalId, true);

        uint256 recipientBefore = usdc.balanceOf(outsider);

        usdcPot.executeProposal(proposalId);

        assertEq(usdc.balanceOf(outsider), recipientBefore + 50e6);
    }

    function test_RevertWhen_ExecuteUnapprovedProposal() public {
        _fundETHPot();

        vm.prank(alice);
        ethPot.createProposal(outsider, 0.5 ether, "Dinner", "food");

        // No votes yet — still ACTIVE
        vm.expectRevert(Pot.NotEnoughVotes.selector);
        ethPot.executeProposal(0);
    }

    function test_MultipleProposals_ExecuteSequentially() public {
        _fundETHPot();

        // Proposal 0 — 1 ETH
        vm.prank(alice);
        ethPot.createProposal(outsider, 1 ether, "Hotel", "accommodation");

        vm.prank(alice);
        ethPot.vote(0, true);
        vm.prank(bob);
        ethPot.vote(0, true);
        vm.prank(charlie);
        ethPot.vote(0, true);
        vm.prank(dave);
        ethPot.vote(0, true);

        ethPot.executeProposal(0);

        // Proposal 1 — 2 ETH
        vm.prank(bob);
        ethPot.createProposal(outsider, 2 ether, "Activities", "party");

        vm.prank(alice);
        ethPot.vote(1, true);
        vm.prank(bob);
        ethPot.vote(1, true);
        vm.prank(charlie);
        ethPot.vote(1, true);
        vm.prank(dave);
        ethPot.vote(1, true);

        ethPot.executeProposal(1);

        // Total spent: 3 ETH out of 5 ETH pot
        assertEq(ethPot.totalFunds(), 2 ether);
    }

    // ══════════════════════════════════════════════
    //  CANCEL POT
    // ══════════════════════════════════════════════

    function test_CancelPot_AfterDeadline() public {
        // Only Alice contributes
        vm.prank(alice);
        ethPot.contribute{value: CONTRIBUTION}();

        // Warp past deadline
        vm.warp(block.timestamp + DEADLINE + 1);

        ethPot.cancelPot();

        assertEq(uint256(ethPot.state()), uint256(Pot.PotState.CANCELLED));
    }

    function test_RevertWhen_CancelBeforeDeadline() public {
        vm.expectRevert(Pot.DeadlineNotReached.selector);
        ethPot.cancelPot();
    }

    function test_CancelPot_RefundContributors() public {
        // Alice contributes, Bob doesn't
        vm.prank(alice);
        ethPot.contribute{value: CONTRIBUTION}();

        vm.warp(block.timestamp + DEADLINE + 1);
        ethPot.cancelPot();

        uint256 aliceBefore = alice.balance;

        vm.prank(alice);
        ethPot.claimRefund();

        assertEq(alice.balance, aliceBefore + CONTRIBUTION);
    }

    function test_RevertWhen_NonContributorClaimsRefund_Cancelled() public {
        vm.warp(block.timestamp + DEADLINE + 1);
        ethPot.cancelPot();

        // Bob never contributed
        vm.prank(bob);
        vm.expectRevert(Pot.IncorrectAmount.selector);
        ethPot.claimRefund();
    }

    // ══════════════════════════════════════════════
    //  EMERGENCY EXIT
    // ══════════════════════════════════════════════

    function test_EmergencyExit_TriggersAtTwoThirds() public {
        _fundETHPot();

        vm.prank(alice);
        ethPot.emergencyExit();

        vm.prank(bob);
        ethPot.emergencyExit();

        vm.prank(charlie);
        ethPot.emergencyExit();

        // 3 votes → still ACTIVE (3*3=9 < 5*2=10)
        assertEq(uint256(ethPot.state()), uint256(Pot.PotState.ACTIVE));

        vm.prank(dave);
        ethPot.emergencyExit();

        // 4 votes → CLOSED (4*3=12 >= 5*2=10)
        assertEq(uint256(ethPot.state()), uint256(Pot.PotState.CLOSED));
    }

    function test_RevertWhen_DoubleEmergencyVote() public {
        _fundETHPot();

        vm.prank(alice);
        ethPot.emergencyExit();

        vm.prank(alice);
        vm.expectRevert(Pot.AlreadyVotedEmergency.selector);
        ethPot.emergencyExit();
    }

    function test_EmergencyExit_ProportionalRefund() public {
        _fundETHPot();

        // Spend 2 ETH first
        vm.prank(alice);
        ethPot.createProposal(outsider, 2 ether, "Expense", "other");

        vm.prank(alice);
        ethPot.vote(0, true);
        vm.prank(bob);
        ethPot.vote(0, true);
        vm.prank(charlie);
        ethPot.vote(0, true);
        vm.prank(dave);
        ethPot.vote(0, true);

        ethPot.executeProposal(0);

        // Now emergency exit → 3 ETH remaining / 5 members = 0.6 ETH each
        vm.prank(alice);
        ethPot.emergencyExit();
        vm.prank(bob);
        ethPot.emergencyExit();
        vm.prank(charlie);
        ethPot.emergencyExit();
        vm.prank(dave);
        ethPot.emergencyExit();

        uint256 aliceBefore = alice.balance;

        vm.prank(alice);
        ethPot.claimRefund();

        assertEq(alice.balance, aliceBefore + 0.6 ether);
    }

    // ══════════════════════════════════════════════
    //  CLOSE POT
    // ══════════════════════════════════════════════

    function test_ClosePot_ByCreator() public {
        _fundETHPot();

        // This test contract is the creator (it called `new Pot(...)`)
        ethPot.closePot();

        assertEq(uint256(ethPot.state()), uint256(Pot.PotState.CLOSED));
    }

    function test_RevertWhen_NonCreatorCloses() public {
        _fundETHPot();

        vm.prank(alice);
        vm.expectRevert("Pot: only creator can close");
        ethPot.closePot();
    }

    // ══════════════════════════════════════════════
    //  REFUNDS
    // ══════════════════════════════════════════════

    function test_ClaimRefund_USDC_AfterClose() public {
        _fundUSDCPot();

        // Creator (this contract) closes the pot
        usdcPot.closePot();

        uint256 aliceBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        usdcPot.claimRefund();

        // 500 USDC total / 5 members = 100 USDC each
        assertEq(usdc.balanceOf(alice), aliceBefore + USDC_CONTRIBUTION);
    }

    function test_RevertWhen_DoubleClaimRefund() public {
        _fundETHPot();
        ethPot.closePot();

        vm.prank(alice);
        ethPot.claimRefund();

        vm.prank(alice);
        vm.expectRevert(Pot.AlreadyClaimed.selector);
        ethPot.claimRefund();
    }

    function test_RevertWhen_ClaimRefund_WrongState() public {
        _fundETHPot();

        // Pot is ACTIVE, not CLOSED or CANCELLED
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Pot.WrongState.selector, Pot.PotState.CLOSED, Pot.PotState.ACTIVE));
        ethPot.claimRefund();
    }

    function test_AllMembersClaimRefund_DrainsCompletely() public {
        _fundETHPot();
        ethPot.closePot();

        for (uint256 i = 0; i < members.length; i++) {
            vm.prank(members[i]);
            ethPot.claimRefund();
        }

        assertEq(ethPot.totalFunds(), 0);
        assertEq(address(ethPot).balance, 0);
    }

    // ══════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ══════════════════════════════════════════════

    function test_GetMemberCount() public view {
        assertEq(ethPot.getMemberCount(), 5);
    }

    function test_GetMembers() public view {
        address[] memory m = ethPot.getMembers();

        assertEq(m.length, 5);
        assertEq(m[0], alice);
        assertEq(m[4], eve);
    }

    function test_HasVotedOnProposal() public {
        _fundETHPot();

        vm.prank(alice);
        ethPot.createProposal(outsider, 0.5 ether, "Test", "other");

        assertFalse(ethPot.hasVotedOnProposal(0, alice));

        vm.prank(alice);
        ethPot.vote(0, true);

        assertTrue(ethPot.hasVotedOnProposal(0, alice));
        assertFalse(ethPot.hasVotedOnProposal(0, bob));
    }

    // ══════════════════════════════════════════════
    //  EVENTS
    // ══════════════════════════════════════════════

    function test_ProposalCreated_EmitsEvent() public {
        _fundETHPot();

        vm.expectEmit(true, true, false, true);
        emit Pot.ProposalCreated(0, alice, outsider, 0.5 ether, "Dinner", "food");

        vm.prank(alice);
        ethPot.createProposal(outsider, 0.5 ether, "Dinner", "food");
    }

    function test_ProposalExecuted_EmitsReceipt() public {
        _fundETHPot();
        uint256 proposalId = _createAndApproveProposal(ethPot);

        vm.expectEmit(true, true, false, true);
        emit Pot.ProposalExecuted(proposalId, outsider, 0.5 ether, "food");

        ethPot.executeProposal(proposalId);
    }
}
