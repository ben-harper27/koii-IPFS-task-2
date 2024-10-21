import { namespaceWrapper } from "@_koii/namespace-wrapper";
import axios from "axios";
import {baseIpfsApiUrl} from "./ipfsEndpoints.js";

export async function task(roundNumber) {
  // Run your task and store the proofs to be submitted for auditing
  // The submission of the proofs is done in the submission function
  try {
    console.log(`EXECUTE TASK FOR ROUND ${roundNumber}`);
    console.log("Started Task", new Date(), "TEST");
    const ipfsResponse = await axios.post(`${baseIpfsApiUrl}/api/v0/pin/ls`);
    const data = ipfsResponse.data;
    const cids = Object.keys(data.Keys);

    const proofs = await Promise.all(
      cids.map(async (cid) => {
        const keypair = await namespaceWrapper.getSubmitterAccount();
        const requesterPubKey = keypair.publicKey.toString();
        const signature = await namespaceWrapper.payloadSigning(cid);
        return {cid, requesterPubKey, signature};
      }),
    );

    const submission = {
      cids,
      proofs
    };
    await namespaceWrapper.storeSet("value", submission);
    return submission;
  } catch (error) {
    console.error("EXECUTE TASK ERROR:", error);
  }
}
