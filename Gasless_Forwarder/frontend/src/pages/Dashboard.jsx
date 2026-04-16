/* eslint-disable no-unused-vars */
import { useState, useContext, useEffect } from 'react';
import { Web3Context } from '../context/Web3Context';
import TestToken from '../contracts/TestToken.json';
import { Loader, Download, Wallet } from 'lucide-react';
import jsPDF from 'jspdf';
import { saveReceipt } from '../service/api';


// Add this new function before the Dashboard component
const generateTransferReceipt = (transferData) => {
  const pdf = new jsPDF();
  const date = new Date().toLocaleString();

  pdf.setFontSize(20);
  pdf.text('Transfer Receipt', 105, 20, { align: 'center' });

  pdf.setFontSize(12);
  pdf.text([
    `Date: ${date}`,
    `Transaction Type: Gasless Token Transfer`,
    `Token Address: ${transferData.tokenAddress}`,
    `From: ${transferData.from}`,
    `To: ${transferData.to}`,
    `Amount: ${transferData.amount} TEST`,
    `Network: ${window.ethereum.networkVersion}`,
    `Deadline: ${new Date(transferData.deadline * 1000).toLocaleString()}`
  ], 20, 40);

  pdf.save('transfer-receipt.pdf');
};

export default function Dashboard() {
  const { web3, account, forwarder, loading: web3Loading } = useContext(Web3Context);
  const [formData, setFormData] = useState({
    tokenAddress: '0xC08cbc1EE5f4Cd46FfcAfD9dA48612a312b760FF',
    recipient: '',
    amount: '',
  });
  const [permitData, setPermitData] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [accountBalance, setAccountBalance] = useState('0');
  const [shortAccount, setShortAccount] = useState('');

  const updateBalances = async () => {
    // Require web3, token address, account and forwarder instance
    if (!web3 || !formData.tokenAddress || !account || !forwarder) return;

    try {
      // Defensive check: make sure there's actually contract code at the token address on the current provider.
      // If MetaMask is connected to a different network than the one you deployed to, getCode will return '0x'.
      const code = await web3.eth.getCode(formData.tokenAddress);
      if (!code || code === '0x' || code === '0x0') {
        throw new Error(`No contract found at ${formData.tokenAddress} on the current network. Check MetaMask network.`);
      }

      const tokenContract = new web3.eth.Contract(
        TestToken.abi,
        formData.tokenAddress
      );

      const balance = await tokenContract.methods.balanceOf(account).call();
      const formattedBalance = web3.utils.fromWei(balance, 'ether');
      setAccountBalance(formattedBalance);

      // Prefer the standard options.address, fallback to legacy _address
      const forwarderAddress = forwarder.options?.address || forwarder._address;
      const contractBalance = await tokenContract.methods.balanceOf(forwarderAddress).call();
      const formattedContractBalance = web3.utils.fromWei(contractBalance, 'ether');
      setTokenBalance(formattedContractBalance);
    } catch (error) {
      console.error('Error fetching balances:', error);
      // surface to UI so it's easier to debug
      setStatus({ type: 'error', message: error.message });
    }
  };

  useEffect(() => {
    updateBalances();
  }, [web3, account, formData.tokenAddress, forwarder]);

  useEffect(() => {
    if (account) {
      setShortAccount(`${account.slice(0, 6)}...${account.slice(-4)}`);
    }
  }, [account]);

  const handleSignPermit = async () => {
    try {
      setLoading(true);

      const tokenContract = new web3.eth.Contract(
        TestToken.abi,
        formData.tokenAddress
      );

      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const nonce = await tokenContract.methods.nonces(account).call();
      const chainId = await web3.eth.getChainId();
      const name = await tokenContract.methods.name().call();
      const amount = web3.utils.toWei(formData.amount, 'ether');

      // Convert BigInt values to strings
      const domainData = {
        name: name,
        version: '1',
        chainId: chainId.toString(),
        verifyingContract: formData.tokenAddress
      };

      const message = {
        owner: account,
        spender: forwarder._address,
        value: amount.toString(),
        nonce: nonce.toString(),
        deadline: deadline.toString()
      };

      const typedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' }
          ],
          Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
          ]
        },
        primaryType: 'Permit',
        domain: domainData,
        message: message
      };

      // Use eth_signTypedData_v4 instead of personal.sign for proper EIP-712 signing
      const signature = await window.ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [account, JSON.stringify(typedData)],
      });

      // Split signature
      const r = signature.slice(0, 66);
      const s = '0x' + signature.slice(66, 130);
      const v = parseInt(signature.slice(130, 132), 16);

      setPermitData({
        tokenAddress: formData.tokenAddress,
        from: account,
        to: formData.recipient,
        amount: amount.toString(),
        deadline: deadline,
        v,
        r,
        s
      });

      setStatus({
        type: 'success',
        message: 'Permit signed successfully!'
      });

    } catch (error) {
      console.error(error);
      setStatus({
        type: 'error',
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteTransfer = async () => {
    try {
      setLoading(true);

      if (!permitData) {
        throw new Error('No permit data available');
      }

      const tx = await forwarder.methods
        .forwardTransferWithPermit(
          permitData.tokenAddress,
          permitData.from,
          permitData.to,
          permitData.amount,
          permitData.deadline,
          permitData.v,
          permitData.r,
          permitData.s
        )
        .send({ from: account });

      // Create receipt data
    const receiptData = {
      transactionType: 'Gasless Token Transfer',
      tokenAddress: permitData.tokenAddress,
      from: permitData.from,
      to: permitData.to,
      amount: web3.utils.fromWei(permitData.amount, 'ether'),
      network: await web3.eth.getChainId(),
      deadline: new Date(permitData.deadline * 1000).toISOString(),
      status: 'completed',
      transactionHash: tx.transactionHash,
      timestamp: new Date().toISOString(),
      gasUsed: tx.gasUsed,
      permitData: {
        v: permitData.v,
        r: permitData.r,
        s: permitData.s
      }
    };

    // Save receipt to MongoDB
    await saveReceipt(receiptData);

      setStatus({
        type: 'success',
        message: 'Transfer executed successfully!'
      });

      // Add this line to update balances after successful transfer
      await updateBalances();

      // After successful transfer, generate receipt
      generateTransferReceipt({
        ...permitData,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error(error);
      setStatus({
        type: 'error',
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      {/* Add header section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h2 className="text-2xl font-bold text-gray-900">Gasless Transfer Dashboard</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center px-4 py-2 bg-gray-100 rounded-lg">
                <Wallet className="h-5 w-5 text-gray-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">{shortAccount || 'Not Connected'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold mb-8 text-gray-900">Gasless Token Transfer with Permit</h1>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Token Address</label>
              <input
                className="w-full bg-gray-100 rounded-lg p-3 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={formData.tokenAddress}
                onChange={(e) => setFormData({ ...formData, tokenAddress: e.target.value })}
                placeholder="0x..."
              />
            </div>

            <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
              <div>
                Your Balance: {accountBalance} TEST
              </div>
              <div>
                Contract Balance: {tokenBalance} TEST
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Recipient Address</label>
              <input
                className="w-full bg-gray-100 rounded-lg p-3 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={formData.recipient}
                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                placeholder="0x..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Amount</label>
              <input
                type="number"
                className="w-full bg-gray-100 rounded-lg p-3 text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.0"
              />
            </div>

            <button
              onClick={handleSignPermit}
              disabled={loading || !account}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center"
            >
              {loading ? (
                <Loader className="animate-spin h-5 w-5 text-white" />
              ) : (
                'Sign Permit'
              )}
            </button>

            {permitData && (
              <button
                onClick={handleExecuteTransfer}
                disabled={loading || account === permitData.from}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center"
              >
                {loading ? (
                  <Loader className="animate-spin h-5 w-5 text-white" />
                ) : (
                  'Execute Transfer (Recipient Only)'
                )}
              </button>
            )}

            {/* Modify the success message to include download button */}
            {status.message && status.type === 'success' && (
              <div className="p-4 rounded-lg bg-green-100 border border-green-200 flex justify-between items-center">
                <span>{status.message}</span>
                <button
                  onClick={() => generateTransferReceipt(permitData)}
                  className="flex items-center px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </button>
              </div>
            )}

            {status.message && (
              <div
                className={`p-4 rounded-lg ${status.type === 'success' ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'
                  }`}
              >
                {status.message}
              </div>
            )}

            {permitData && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3 text-gray-900">Permit Data:</h3>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm max-h-96">
                  {JSON.stringify(permitData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}