import { Wallet } from "@ethersproject/wallet";
import { createTxRaw } from "@quarix/proto";
import { signTypedData } from "@metamask/eth-sig-util";
import { arrayify, concat, splitSignature } from "@ethersproject/bytes";
import { generatePostBodyBroadcast } from "@quarix/provider";
import { ethToQuarix } from "@quarix/address-converter";
import { createTxMsgSend, createTxMsgIssueOrRenew } from "@quarix/transactions";
import axios from "axios";
import dayjs from "dayjs";
import fs from "fs-extra";

let { rpc, api, chainId, cosmosChainId, hexPrivateKey, amount, ipMax, addressMax } = require("../../faucet.json");
const db = "./db/";

const http = axios.create({
  baseURL: "",
  timeout: 150000, // 请求超时时间
});

http.interceptors.response.use(
  (res) => {
    if (res.status == 200) {
      const { result } = res.data;
      if (result) {
        if (result.error) {
          return Promise.reject(JSON.stringify(result.error));
        } else {
          return Promise.resolve(result);
        }
      } else {
        return Promise.resolve(res.data);
      }
    } else {
      return Promise.reject(res.statusText);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

const get = (url, params) => {
  return new Promise((resolve, reject) => {
    http
      .get(url, { params })
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const authAccount = async (address) => {
  return get(`${api}/cosmos/auth/v1beta1/accounts/${address}`);
};
const hasKYC = async (address) => {
  try {
    const data = await http.get(`${api}/quarix/kybkyc/v1/kyc_status?account=${address}`);
    return data;
  } catch (error) {
  }

  return { has: false }
};
const txCommit = async (tx) => {
  return get(`${rpc}/broadcast_tx_commit`, { tx });
};

// const faucetTemplet = {
//   "date": 20220114,
//   "data": ["ip+id+address"]
// }

let faucet = undefined;

const isObj = (object) => {
  return object && typeof object == "object" && Object.prototype.toString.call(object).toLowerCase() == "[object object]";
};

// 确保faucet对象是faucetTemplet格式
const initFaucet = (faucet, date) => {
  if (!isObj(faucet)) {
    faucet = {};
  }
  if (faucet.date == undefined) {
    faucet["date"] = date;
  }
  if (!Array.isArray(faucet["items"])) {
    faucet["items"] = [];
  }
  return faucet;
};

const calcCount = (faucet, ip, id, to) => {
  let ret = { ip: 0, id: 0, to: 0 };
  for (const item of faucet.items) {
    ret.ip += item.includes(ip.toLowerCase()) ? 1 : 0;
    ret.id += item.includes(id.toLowerCase()) ? 1 : 0;
    ret.to += item.includes(to.toLowerCase()) ? 1 : 0;
  }
  return ret;
};

const createTxHex = (createTxMsg, context, params, privateKey, signType = "eip712") => {
  const msg = createTxMsg(context, params);
  const privateKeyBuf = Buffer.from(privateKey, "hex");

  let signatureBytes;
  if (signType === "eip712") {
    const signature = signTypedData({
      privateKey: privateKeyBuf,
      data: msg.eipToSign,
      version: "V4",
    });
    signatureBytes = Buffer.from(signature.replace("0x", ""), "hex");
  } else {
    const wallet = new Wallet(privateKeyBuf);
    const dataToSign = `0x${Buffer.from(msg.signDirect.signBytes, "base64").toString("hex")}`;
    const signatureRaw = wallet._signingKey().signDigest(dataToSign);
    const splitedSignature = splitSignature(signatureRaw);
    signatureBytes = arrayify(concat([splitedSignature.r, splitedSignature.s]));
  }

  const rawTx = createTxRaw(msg.signDirect.body.toBinary(), msg.signDirect.authInfo.toBinary(), [signatureBytes]);
  const txBytes = JSON.parse(generatePostBodyBroadcast(rawTx)).tx_bytes;
  const txHexBytes = "0x" + Buffer.from(txBytes).toString("hex");
  return txHexBytes;
};

const privateKeyToPublicKey = (privateKey, base64Encode = true) => {
  const wallet = new Wallet(Buffer.from(privateKey.replace("0x", ""), "hex"));
  const compressedPublicKey = wallet._signingKey().compressedPublicKey.toLowerCase().replace("0x", "");
  if (base64Encode) {
    return Buffer.from(compressedPublicKey, "hex").toString("base64");
  }
  return compressedPublicKey;
};

const privateKeyToQuarixAddress = (privateKey) => {
  const wallet = new Wallet(Buffer.from(privateKey.replace("0x", ""), "hex"));
  return ethToQuarix(wallet.address);
};

console.log("api/faucet start", chainId, cosmosChainId, hexPrivateKey, amount, ipMax);

export default async function handler(req, res) {
  const { body, headers } = req;
  const { to, id, denom } = body;
  const ip = headers["cf-connecting-ip"] || "127.0.0.1";
  const date = dayjs().format("YYYYMMDD");
  const item = ip.toLowerCase() + "_" + id.toLowerCase() + "_" + to.toLowerCase();
  console.log(ip, id, to)
  if (faucet == undefined) {
    try {
      await fs.ensureDir(db);
      faucet = await fs.readJson(db + date + ".json");
    } catch (error) { }
  } else {
    if (faucet.date != date) {
      await fs.writeJSON(db + faucet.date + ".json", faucet);
      faucet = {};
    }
  }
  faucet = initFaucet(faucet, date);

  try {
    const ret = calcCount(faucet, ip, id, to);
    console.log(`date=${date}, ip=${ip}|${ret.ip}, id=${id}|${ret.id}, to=${to}|${ret.to}`);
    if (!ip || !id) {
      return res.status(200).json({ msg: `forbid by the server!`, code: 403 });
    }
    if (ret.to >= addressMax || ret.id >= addressMax) {
      return res.status(200).json({ msg: `A maximum of ${addressMax} withdrawals per day are allowed`, code: 401 });
    } else if (ret.ip >= ipMax) {
      return res.status(200).json({ msg: `One IP address can be received for a maximum of ${ipMax} times a day`, code: 400 });
    }

    let data;
    let code = 0;
    let msg = "success";

    const chain = {
      chainId: 8888888,
      cosmosChainId: "quarix_8888888-1",
    };
    // convert mnemonic to private key
    let privateKey = hexPrivateKey;
    if (hexPrivateKey.indexOf(" ") > 0) {
      privateKey = Wallet.fromMnemonic(privateKeyOrMnemonic)._signingKey().privateKey.toLowerCase().replace("0x", "");
    }

    let sender = {
      accountAddress: privateKeyToQuarixAddress(privateKey),
      sequence: "0",
      accountNumber: "0",
      pubkey: privateKeyToPublicKey(privateKey),
    };

    const fee = {
      amount: "4000000000000000",
      denom: "aqare",
      gas: "2000000",
    };

    const memo = "send by faucet";

    const params = {
      destinationAddress: to,
      amount,
      denom,
    };

    const account = await authAccount(sender.accountAddress);
    sender.sequence = account.account.base_account.sequence;
    sender.accountNumber = account.account.base_account.account_number;

    const kyc = await hasKYC(to);
    if (!kyc.has) {
      const issueOrRenewParams = {
        to,
        expiryDate: "1849306088",
      };

      const context = { chain, sender, fee, memo: "issue or renew a kyc by faucet" };
      const txHex = createTxHex(createTxMsgIssueOrRenew, context, issueOrRenewParams, privateKey, "eip712");
      data = await txCommit(txHex);
      console.log("data =========> ", data)
      sender.sequence = String(parseInt(sender.sequence) + 1);
    }

    const context = { chain, sender, fee, memo };
    const txHex = createTxHex(createTxMsgSend, context, params, privateKey, "eip712");
    data = await txCommit(txHex);
    if (data?.check_tx?.code != 0) {
      code = data?.check_tx?.code;
      msg = data?.check_tx?.log;
    }
    if (code == 0 && data?.deliver_tx?.code != 0) {
      code = data?.deliver_tx?.code;
      msg = data?.deliver_tx?.log;
    }

    faucet.items.push(item);
    await fs.writeJSON(db + faucet.date + ".json", faucet);
    res.status(200).json({ msg, data, code });
  } catch (error) {
    console.error(error);
    res.status(200).json({ msg: "sendSignedTransaction fail, try", code: 402 });
  }
}
