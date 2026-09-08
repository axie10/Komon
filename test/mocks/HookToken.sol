// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Callback a HookToken fires mid-transfer, ERC-777 style
interface ITransferHook {
    function onTokenTransfer() external;
}

/**
 * @title HookToken
 * @dev ERC-20 mock with an ERC-777-style transfer hook: it calls back into a
 *      registered contract in the middle of `transferFrom`, before the Pot has
 *      finished bookkeeping. Used to prove `contribute()` cannot be re-entered
 *      (audit finding M-01).
 */
contract HookToken is ERC20 {
    /// @notice Contract to call back into during transferFrom
    address public hookTarget;

    constructor() ERC20("Hook Token", "HOOK") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setHookTarget(address _target) external {
        hookTarget = _target;
    }

    /// @dev Fires the hook BEFORE moving balances — the classic reentrancy window
    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        address target = hookTarget;

        if (target != address(0)) {
            // One-shot: clear it so the reentrant call doesn't recurse forever
            hookTarget = address(0);
            ITransferHook(target).onTokenTransfer();
        }

        return super.transferFrom(from, to, value);
    }
}
