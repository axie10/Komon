// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import {Pot} from "./Pot.sol";

/**
 * @title KomonFactory
 * @author Axie
 * @notice Factory contract that creates and registers Komon Pot instances.
 * @dev One factory, unlimited pots. Each pot is a fully independent contract
 *      with isolated funds and permissions. The factory only creates and indexes —
 *      it never holds funds or controls pots after creation.
 *
 *      Think of it like an Express route handler that spins up isolated
 *      server instances — the factory routes creation, each pot runs on its own.
 */
contract KomonFactory {
    // ──────────────────────────────────────────────
    //  State Variables
    // ──────────────────────────────────────────────

    /// @notice All pots ever created, in order
    address[] public allPots;

    /// @notice Pots created by a specific address
    mapping(address => address[]) public potsByCreator;

    /// @notice All pots where a specific address is a member
    mapping(address => address[]) public potsByMember;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event PotCreated(
        address indexed potAddress,
        address indexed creator,
        string name,
        address token,
        uint256 contributionAmount,
        uint256 memberCount,
        uint256 deadline
    );

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    error InvalidMemberCount();
    error InvalidAmount();
    error InvalidDeadline();

    // ──────────────────────────────────────────────
    //  Factory Function
    // ──────────────────────────────────────────────

    /**
     * @notice Creates a new Komon Pot.
     * @param _name         Human-readable name (e.g. "Trip to Berlin")
     * @param _token        ERC-20 token address, or address(0) for ETH
     * @param _members      Array of all member addresses
     * @param _amount       Contribution amount per member
     * @param _deadline     Timestamp — all contributions must be in before this
     * @return potAddress   The address of the newly deployed Pot contract
     */
    function createPot(
        string calldata _name,
        address _token,
        address[] calldata _members,
        uint256 _amount,
        uint256 _deadline
    ) external returns (address potAddress) {
        if (_members.length < 2) revert InvalidMemberCount();
        if (_amount == 0) revert InvalidAmount();
        if (_deadline <= block.timestamp) revert InvalidDeadline();

        // Deploy a new Pot instance
        Pot newPot = new Pot(_name, _token, _members, _amount, _deadline, msg.sender);

        potAddress = address(newPot);

        // Register in global index
        allPots.push(potAddress);

        // Register by creator
        potsByCreator[msg.sender].push(potAddress);

        // Register by member (so each member can find their pots)
        for (uint256 i = 0; i < _members.length; i++) {
            potsByMember[_members[i]].push(potAddress);
        }

        emit PotCreated(potAddress, msg.sender, _name, _token, _amount, _members.length, _deadline);
    }

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    /// @notice Returns the total number of pots ever created
    function getTotalPots() external view returns (uint256) {
        return allPots.length;
    }

    /// @notice Returns all pot addresses
    function getAllPots() external view returns (address[] memory) {
        return allPots;
    }

    /// @notice Returns all pots created by a specific address
    function getPotsByCreator(address _creator) external view returns (address[] memory) {
        return potsByCreator[_creator];
    }

    /// @notice Returns all pots where an address is a member
    function getPotsByMember(address _member) external view returns (address[] memory) {
        return potsByMember[_member];
    }
}
