import { namespaceWrapper, app } from "@_koii/namespace-wrapper";
import { getPinnedCIDs, addIPFSCID, getIPFSCID } from "./ipfsEndpoints.js";
import multer from 'multer';

export function routes() {
  /**
   *
   * Define all your custom routes here
   *
   */

  // Example route
  app.get("/value", async (_req, res) => {
    const value = await namespaceWrapper.storeGet("value");
    console.log("value", value);
    res.status(200).json({ value: value });
  });

  const storage = multer.memoryStorage();
  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });
  app.get('/ipfs/get-pinned-cids', getPinnedCIDs);
  app.post('/ipfs/add', upload.array('files'), addIPFSCID);
  app.get('/ipfs/:cid/:filename?', getIPFSCID);
}
