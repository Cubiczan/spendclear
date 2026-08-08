// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ICVA.sol";

/// @title MockCVA
/// @notice Test implementation of Cleanverse Verified Assets.
contract MockCVA is ICVA {
    mapping(address => bool) public verified;
    mapping(address => string) public countries;
    mapping(address => string) public assetClasses;
    mapping(address => uint256) public traceDepth;
    mapping(address => bool) public flagged;

    /// @notice Register a token as CVA-verified (for testing).
    function register(
        address token,
        string calldata country,
        string calldata assetClass,
        uint256 depth
    ) external {
        verified[token] = true;
        countries[token] = country;
        assetClasses[token] = assetClass;
        traceDepth[token] = depth;
    }

    /// @notice Flag a token (for testing denial).
    function flag(address token) external {
        flagged[token] = true;
    }

    function isVerified(address token) external view returns (bool) {
        return verified[token];
    }

    function assetInfo(address token) external view returns (
        string memory originCountry,
        string memory assetClass,
        uint256 traceabilityDepth
    ) {
        return (countries[token], assetClasses[token], traceDepth[token]);
    }

    function isClean(address token, uint256) external view returns (bool) {
        return verified[token] && !flagged[token];
    }
}