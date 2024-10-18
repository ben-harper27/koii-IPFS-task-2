import { namespaceWrapper } from "@_koii/namespace-wrapper";
import axios from 'axios';
import { baseIpfsGatewayUrl } from './ipfsEndpoints.js';

async function fetchFileFromIPFS(cid) {
  try {
    const response = await axios.get(`${baseIpfsGatewayUrl}/ipfs/${cid}`, {
      responseType: 'arraybuffer',
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`Error fetching file from IPFS for CID: ${cid}`, error);
    return null;
  }
}

export async function audit(submission, roundNumber) {
  /**
   * Audit a submission
   * This function should return true if the submission is correct, false otherwise
   */
  console.log(`AUDIT SUBMISSION FOR ROUND ${roundNumber}`);
  console.log(submission);
  let vote = false;
  submission = JSON.parse(submission);

  try {
    // TODO: Check the submitter has the right to store
    for (let proof of submission.proofs) {
      const {cid, requesterPubKey, signature} = proof;
      console.log('CID', cid);
      console.log('REQUESTER PUB KEY', requesterPubKey);
      console.log('SIGNATURE', signature);

      // 1. Fetch the file from IPFS
      const fileBuffer = await fetchFileFromIPFS(cid);
      console.log('FILE BUFFER', fileBuffer);

      const taskState = await namespaceWrapper.getTaskState();
      console.log('TASK STATE', taskState);
      // 2. Check that the proofs are valid (signature, etc)
      const { data } = await namespaceWrapper.verifySignature(signature, requesterPubKey);
      console.log('IS SIGNATURE VALID', data);
      const parsedData = JSON.parse(data);
      console.log('PARSED DATA', parsedData);
      vote = parsedData == cid;
      // TODO: 3. Query the node for the CID
      // a) did they send the file
      // b) does the file sent match the CID
    }
  } catch (e) {
    console.error(e);
    return false;
  }

  return vote;
}
