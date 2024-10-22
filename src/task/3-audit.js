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

export async function audit(submission, roundNumber, submitterKey) {
  /**
   * Audit a submission
   * This function should return true if the submission is correct, false otherwise
   */
  console.log(`AUDIT SUBMISSION FOR ROUND ${roundNumber} from ${submitterKey}`);
  console.log(submission);
  let vote = false;
  submission = JSON.parse(submission);

  try {
    // TODO: Check the submitter has the right to store
    for (let proof of submission.proofs) {
      const {cid, mainAccountPubkey, signature} = proof;
      console.log('CID', cid);
      console.log('MAIN ACCOUNT PUB KEY', mainAccountPubkey);
      console.log('SIGNATURE', signature);

      // 1. Fetch the file from IPFS
      const fileBuffer = await fetchFileFromIPFS(cid);
      console.log('FILE BUFFER', fileBuffer);

      const taskState = await namespaceWrapper.getTaskState();
      console.log('TASK STATE', taskState);
      // 2. Check that the proofs are valid (signature, etc)
      const { data } = await namespaceWrapper.verifySignature(signature, mainAccountPubkey);
      console.log('IS SIGNATURE VALID', data);
      const parsedData = JSON.parse(data);
      console.log('PARSED DATA', parsedData);
      vote = parsedData == cid;
      // TODO: 3. Query the node for the CID
      // 3. Query the node for the CID
      if (taskState && taskState.ip_address_list && taskState.ip_address_list[submitterKey]) {
        const nodeIpAddress = taskState.ip_address_list[submitterKey];
        try {
          const nodeResponse = await axios.get(`${nodeIpAddress}/ipfs/${cid}`, {
            responseType: 'arraybuffer',
            timeout: 5000 // 5 seconds timeout
          });
          
          // a) Check if they sent the file
          if (nodeResponse.status === 200) {
            const nodeFileBuffer = Buffer.from(nodeResponse.data);
            
            // b) Check if the file sent matches the CID
            if (nodeFileBuffer.equals(fileBuffer)) {
              console.log(`File from node matches IPFS for CID: ${cid}`);
              vote = true;
            } else {
              console.log(`File from node does not match IPFS for CID: ${cid}`);
              vote = false;
            }
          } else {
            console.log(`Node did not send file for CID: ${cid}`);
            vote = false;
          }
        } catch (error) {
          console.error(`Error querying node for CID: ${cid}`, error);
          vote = false;
        }
      } else {
        console.log(`No IP address found for submitter: ${submitterKey}`);
        vote = false;
      }
    }
  } catch (e) {
    console.error(e);
    return false;
  }

  return vote;
}
