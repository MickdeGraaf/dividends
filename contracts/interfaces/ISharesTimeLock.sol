// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

/**
 * @title SharesTimelock interface
 */
interface ISharesTimeLock {
    function depositByMonths(uint256 amount, uint256 months, address receiver) external;
}
