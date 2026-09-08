// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import {Script, console} from "forge-std/Script.sol";
import {KomonFactory} from "../src/KomonFactory.sol";

/**
 * @title DeployKomonFactory
 * @notice Deploys the KomonFactory contract.
 * @dev Usage:
 *
 *      Local (Anvil):
 *      forge script script/DeployKomonFactory.s.sol --rpc-url http://localhost:8545 --broadcast
 *
 *      Testnet (Arbitrum Sepolia):
 *      forge script script/DeployKomonFactory.s.sol --rpc-url $ARBITRUM_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast --verify
 *
 *      Testnet (Base Sepolia):
 *      forge script script/DeployKomonFactory.s.sol --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast --verify
 */
contract DeployKomonFactory is Script {
    function run() external returns (KomonFactory factory) {
        vm.startBroadcast();

        factory = new KomonFactory();

        console.log("========================================");
        console.log("  Komon Factory deployed successfully");
        console.log("========================================");
        console.log("  Factory address:", address(factory));
        console.log("  Deployer:", msg.sender);
        console.log("  Chain ID:", block.chainid);
        console.log("========================================");

        vm.stopBroadcast();
    }
}
