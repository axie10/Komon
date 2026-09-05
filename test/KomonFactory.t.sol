// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Test, console} from "forge-std/Test.sol";
import {KomonFactory} from "../src/KomonFactory.sol";
import {Pot} from "../src/Pot.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract KomonFactoryTest is Test {
    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    KomonFactory public factory;
    MockUSDC public usdc;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    address[] public members;

    // ──────────────────────────────────────────────
    //  Setup
    // ──────────────────────────────────────────────

    function setUp() public {
        factory = new KomonFactory();
        usdc = new MockUSDC();

        members = new address[](3);
        members[0] = alice;
        members[1] = bob;
        members[2] = charlie;
    }

    // ══════════════════════════════════════════════
    //  POT CREATION
    // ══════════════════════════════════════════════

    function test_CreateETHPot_Success() public {
        vm.prank(alice);
        address potAddress = factory.createPot("Weekend Trip", address(0), members, 1 ether, block.timestamp + 7 days);

        assertTrue(potAddress != address(0));
        assertEq(factory.getTotalPots(), 1);
    }

    function test_CreateUSDCPot_Success() public {
        vm.prank(alice);
        address potAddress = factory.createPot("Shared Rent", address(usdc), members, 100e6, block.timestamp + 30 days);

        Pot pot = Pot(potAddress);
        assertEq(address(pot.token()), address(usdc));
    }

    function test_CreatePot_EmitsEvent() public {
        vm.expectEmit(false, true, false, true);
        emit KomonFactory.PotCreated(
            address(0), // we don't know the address yet
            alice,
            "Weekend Trip",
            address(0),
            1 ether,
            3,
            block.timestamp + 7 days
        );

        vm.prank(alice);
        factory.createPot("Weekend Trip", address(0), members, 1 ether, block.timestamp + 7 days);
    }

    function test_CreateMultiplePots() public {
        vm.prank(alice);
        factory.createPot("Trip 1", address(0), members, 1 ether, block.timestamp + 7 days);

        vm.prank(bob);
        factory.createPot("Trip 2", address(0), members, 2 ether, block.timestamp + 14 days);

        assertEq(factory.getTotalPots(), 2);
    }

    // ══════════════════════════════════════════════
    //  VALIDATION
    // ══════════════════════════════════════════════

    function test_RevertWhen_LessThanTwoMembers() public {
        address[] memory tooFew = new address[](1);
        tooFew[0] = alice;

        vm.prank(alice);
        vm.expectRevert(KomonFactory.InvalidMemberCount.selector);
        factory.createPot("Solo", address(0), tooFew, 1 ether, block.timestamp + 7 days);
    }

    function test_RevertWhen_ZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(KomonFactory.InvalidAmount.selector);
        factory.createPot("Free", address(0), members, 0, block.timestamp + 7 days);
    }

    function test_RevertWhen_DeadlineInPast() public {
        vm.prank(alice);
        vm.expectRevert(KomonFactory.InvalidDeadline.selector);
        factory.createPot("Late", address(0), members, 1 ether, block.timestamp - 1);
    }

    // ══════════════════════════════════════════════
    //  INDEXING
    // ══════════════════════════════════════════════

    function test_GetPotsByCreator() public {
        vm.prank(alice);
        factory.createPot("Trip 1", address(0), members, 1 ether, block.timestamp + 7 days);

        vm.prank(alice);
        factory.createPot("Trip 2", address(0), members, 2 ether, block.timestamp + 14 days);

        vm.prank(bob);
        factory.createPot("Bob's pot", address(0), members, 1 ether, block.timestamp + 7 days);

        address[] memory alicePots = factory.getPotsByCreator(alice);
        address[] memory bobPots = factory.getPotsByCreator(bob);

        assertEq(alicePots.length, 2);
        assertEq(bobPots.length, 1);
    }

    function test_GetPotsByMember() public {
        vm.prank(alice);
        factory.createPot("Trip 1", address(0), members, 1 ether, block.timestamp + 7 days);

        // Create second pot without Charlie
        address[] memory smallGroup = new address[](2);
        smallGroup[0] = alice;
        smallGroup[1] = bob;

        vm.prank(alice);
        factory.createPot("Trip 2", address(0), smallGroup, 1 ether, block.timestamp + 7 days);

        // Alice and Bob are in both pots
        assertEq(factory.getPotsByMember(alice).length, 2);
        assertEq(factory.getPotsByMember(bob).length, 2);

        // Charlie is only in the first pot
        assertEq(factory.getPotsByMember(charlie).length, 1);
    }

    function test_GetAllPots() public {
        vm.prank(alice);
        factory.createPot("Trip 1", address(0), members, 1 ether, block.timestamp + 7 days);

        vm.prank(bob);
        factory.createPot("Trip 2", address(0), members, 2 ether, block.timestamp + 14 days);

        address[] memory allPots = factory.getAllPots();
        assertEq(allPots.length, 2);
    }

    // ══════════════════════════════════════════════
    //  DEPLOYED POT VERIFICATION
    // ══════════════════════════════════════════════

    function test_DeployedPot_HasCorrectConfig() public {
        vm.prank(alice);
        address potAddress = factory.createPot("Beach Weekend", address(0), members, 1 ether, block.timestamp + 7 days);

        Pot pot = Pot(potAddress);

        assertEq(pot.name(), "Beach Weekend");
        assertEq(pot.contributionAmount(), 1 ether);
        assertEq(pot.getMemberCount(), 3);
        assertTrue(pot.isMember(alice));
        assertTrue(pot.isMember(bob));
        assertTrue(pot.isMember(charlie));
        assertEq(uint256(pot.state()), uint256(Pot.PotState.FUNDING));
    }

    function test_DeployedPot_CreatorIsFactory() public {
        vm.prank(alice);
        address potAddress = factory.createPot("Test", address(0), members, 1 ether, block.timestamp + 7 days);

        Pot pot = Pot(potAddress);

        // The factory deployed the pot, so factory is the creator
        assertEq(pot.creator(), alice);
    }
}
