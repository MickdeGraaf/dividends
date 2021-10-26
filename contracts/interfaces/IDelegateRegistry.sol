// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;


interface IDelegateRegistry {
	
	function setDelegate(address delegator, address delegate) external;
    function clearDelegate(address delegator) external;
}