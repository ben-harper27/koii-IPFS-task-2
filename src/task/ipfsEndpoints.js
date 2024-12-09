import axios from 'axios';
import crypto from 'crypto';
import FormData from 'form-data';
import fs from 'fs';
import {Connection, PublicKey, Keypair} from '@_koii/web3.js';

// const multiformats = require('multiformats');
// const base58btc = require('base58btc'); // npm install base58btc
export const baseIpfsApiUrl = 'http://127.0.0.1:5001';
export const baseIpfsGatewayUrl = 'http://127.0.0.1:8080';

const connection = new Connection('https://testnet.koii.network');

export const getIPFSCID = async (req, res) => {
  try {
    const {cid, filename} = req.params;
    const response = await axios(`${baseIpfsGatewayUrl}/ipfs/${cid}/${filename || ''}`, {
      responseType: 'stream',
      timeout: 180000,
    });
    res.set('Content-Type', response.headers['content-type']);

    // Pipe the response stream directly to res.send
    response.data.pipe(res);
    // Pinning the data that you served.
    axios
      .post(`${baseIpfsApiUrl}/api/v0/pin/add?arg=${cid}`)
      .then((response) => {
        console.log('Pin added successfully:', response.data);
      })
      .catch((error) => {
        console.error('Error adding pin:', error);
      });
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      // Timeout error
      res.status(504).send('Request Timed Out');
    } else if (error?.response?.status == 404) {
      res.status(404).send('Not found');
    } else {
      res.status(422).send(error.message);
    }
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Server responded with status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      // Something happened in setting up the request that triggered an error
      console.error('Error:', error.message);
    }
  }
};

export const addIPFSCID = async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).send('No files were uploaded');
    }

    // const signature = req.body.signature;
    // const stakingWalletPubkey = req.body.stakingWalletPubkey;
    // if (!signature || !stakingWalletPubkey) {
    //   return res.status(400).send('No Signature or stakingWalletPubkey provided');
    // }
    // try {
    //   const fileBuffers = files.map((e) => e.buffer);
    //   fileData = Buffer.concat(fileBuffers);
    //   await hashFileData(fileData);
    // } catch (error) {
    //   console.error(error);
    //   return res.status(422).send('File hash is not signed by the wallet properly');
    // }
    // let isStakingWalletValid = await checkStakingWalletValidity(stakingWalletPubkey);
    // if (!isStakingWalletValid) {
    //   return res.status(422).send('Staking wallet is not valid (Mismatch owner)');
    // }

    const formData = new FormData();

    files.forEach((file, index) => {
      formData.append(`${file.originalname}-${index}`, file.buffer, {
        filename: `${file.originalname}`,
        path: `${file.originalname}`,
        contentType: file.mimetype,
      });
    });
    const ipfsResponse = await axios.post(
      `${baseIpfsApiUrl}/api/v0/add?wrap-with-directory=true&cid-version=1`,
      formData
    );
    const parsedResp = ipfsResponse.data
      .split('\n')
      .filter((e) => e != '')
      .map((e) => JSON.parse(e));
    const folderHash = parsedResp.find((e) => e.Name == '');
    console.log('folderHash?.Hash', folderHash);
    res.send({status: 200, cid: folderHash?.Hash});
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      // Timeout error
      res.status(504).send('Request Timed Out');
    } else {
      res.status(500).send('Internal Server Error');
    }
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Server responded with status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      // Something happened in setting up the request that triggered an error
      console.error('Error:', error.message);
    }
  }
};

export const getPinnedCIDs = async (req, res) => {
  try {
    const ipfsResponse = await axios.post(`${baseIpfsApiUrl}/api/v0/pin/ls`);
    const data = ipfsResponse.data;
    res.send({status: 200, pinnedCIDs: data});
  } catch (error) {
    // Handle error
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Server responded with status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      // Something happened in setting up the request that triggered an error
      console.error('Error:', error.message);
    }
  }
};

async function hashFileData(fileData, algorithm = 'sha256') {
  const hash = crypto.createHash(algorithm);
  hash.update(fileData);
  return hash.digest('hex');
}

async function checkStakingWalletValidity(stakingWalletPubkey) {
  try {
    let account = await connection.getAccountInfo(new PublicKey(stakingWalletPubkey));
    if (!account) return false;
    if (account.owner.toBase58() == 'Koiitask22222222222222222222222222222222222') {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error(error);
    return true;
  }
}
