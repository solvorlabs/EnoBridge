/* eslint-disable react/prop-types */
import  { createContext, useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import ForwarderContract from '../contracts/Forwarder.json';

export const Web3Context = createContext(null);

export const Web3Provider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [networkId, setNetworkId] = useState(null);
  const [forwarder, setForwarder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const connectWallet = useCallback(async () => {
    console.log('Attempting to connect wallet...');
    try {
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum);
        console.log('Web3 instance created.');
        console.log("web3instance",web3Instance);

        await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log('Requested accounts from MetaMask.');

        const accounts = await web3Instance.eth.getAccounts();
        console.log('Accounts retrieved:', accounts);

        const netId = await web3Instance.eth.net.getId();
        console.log('Network ID retrieved:', netId);

        // Get contract instance
        const networkData = ForwarderContract.networks[netId];
        if (networkData) {
          console.log('Forwarder contract found on network:', networkData.address);
          const forwarderInstance = new web3Instance.eth.Contract(
            ForwarderContract.abi,
            networkData.address  // Use the address from network data
          );
          setForwarder(forwarderInstance);
        } else {
          // For local development, you can hardcode the address
          const localContractAddress = "0x8323a8ab5889Bb313B76602Fe80BC2e319717FCA";
          const forwarderInstance = new web3Instance.eth.Contract(
            ForwarderContract.abi,
            localContractAddress
          );
          setForwarder(forwarderInstance);
          console.log('Using local contract address:', localContractAddress);
        }

        setWeb3(web3Instance);
        console.log(web3);
        setAccount(accounts[0]);
        setNetworkId(netId);
        setError(null);
        console.log('Wallet connected successfully:', {
          account: accounts[0],
          networkId: netId,
        });
      } else {
        throw new Error('Please install MetaMask');
      }
    } catch (err) {
      console.error('Error during wallet connection:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log('Finished attempting to connect wallet.');
    }
  }, []);

  useEffect(() => {
    if (window.ethereum) {
      console.log('Setting up Ethereum event listeners...');
      
      window.ethereum.on('accountsChanged', (accounts) => {
        console.log('Accounts changed:', accounts);
        setAccount(accounts[0]);
      });

      window.ethereum.on('chainChanged', (chainId) => {
        console.log('Chain changed to:', chainId, 'Reloading...');
        window.location.reload();
      });
    } else {
      console.warn('No Ethereum provider detected. MetaMask is required.');
    }
  }, []);

  useEffect(() => {
    console.log('Initializing connection to wallet...');
    connectWallet();
  }, [connectWallet]);

  return (
    <Web3Context.Provider
      value={{
        web3,
        account,
        networkId,
        forwarder,
        loading,
        error,
        connectWallet,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
