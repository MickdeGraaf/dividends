// SPDX-License-Identifier: LGPL-3.0-only
// Modified version of: https://etherscan.io/address/0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446#code
pragma solidity >=0.7.0 <0.8.0;

contract DelegateRegistry {
    address public timelock = 0x6Bd0D8c8aD8D3F1f97810d5Cc57E9296db73DC45;
    
    // The value is the address of the delegate 
    mapping (address => address) public delegation;
    
    // Using these events it is possible to process the events to build up reverse lookups.
    // The indeces allow it to be very partial about how to build this lookup (e.g. only for a specific delegate).
    event SetDelegate(address indexed delegator, address indexed delegate);
    event ClearDelegate(address indexed delegator, address indexed delegate);
    
    /// @param delegator address of the delegator
    /// @param delegate Address of the delegate
    function setDelegate(address delegator, address delegate) public {
        require(msg.sender == timelock, "Not the timelock");
        require (delegate != msg.sender, "Can't delegate to self");
        require (delegate != address(0), "Can't delegate to 0x0");
        address currentDelegate = delegation[delegator];
        require (delegate != currentDelegate, "Already delegated to this address");
        
        // Update delegation mapping
        delegation[delegator] = delegate;
        
        if (currentDelegate != address(0)) {
            emit ClearDelegate(delegator, currentDelegate);
        }

        emit SetDelegate(delegator, delegate);
    }
    
    ///      The combination of msg.sender and the id can be seen as a unique key.
    /// @param delegator 
    function clearDelegate(address delegator) public {
        require(msg.sender == timelock, "Not the timelock");
        address currentDelegate = delegation[delegator];
        require (currentDelegate != address(0), "No delegate set");
        
        // update delegation mapping
        delegation[delegator] = address(0);
        
        emit ClearDelegate(delegator, currentDelegate);
    }
}