// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title FeeOnTransferToken
 * @dev ERC-20 mock that burns a fee on every transfer between accounts.
 *      The receiver always gets less than the sender sent — this is what breaks
 *      naive `totalFunds += amount` accounting (audit finding H-01).
 *      Mints and burns are exempt so test setup stays predictable.
 */
contract FeeOnTransferToken is ERC20 {
    /// @notice Fee charged on every transfer, in basis points (200 = 2%)
    uint256 public constant FEE_BPS = 200;

    /// @notice Where the fee goes — a sink so totals stay easy to reason about
    address public constant FEE_SINK = address(0xFEE);

    constructor() ERC20("Fee Token", "FEE") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @dev Takes FEE_BPS off every account-to-account transfer
    function _update(address from, address to, uint256 value) internal override {
        // Leave mint (from == 0) and burn (to == 0) untouched
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }

        uint256 fee = (value * FEE_BPS) / 10_000;

        if (fee > 0) {
            super._update(from, FEE_SINK, fee);
        }

        super._update(from, to, value - fee);
    }
}
