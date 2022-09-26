import { Wallet } from "@ethersproject/wallet";
import { signTypedData } from "@metamask/eth-sig-util";
import { ethToEvmos } from "@tharsis/address-converter";
import { generatePostBodyBroadcast } from "@tharsis/provider";
import { createMessageSend, createTxRawEIP712, signatureToWeb3Extension } from "@tharsis/transactions";
import axios from "axios";
import dayjs from "dayjs";
import fs from "fs-extra";
import Web3 from "web3";

let { provider, rpc, api, chainId, cosmosChainId, hexPrivateKey, value, govValue, gasPrice, gas, ipMax, addressMax } = require("../../faucet.json");
const web3 = new Web3(provider);
const account = web3.eth.accounts.privateKeyToAccount(hexPrivateKey);
const from = account.address;
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

const txHexBytes = async (privateKeyHex, chain, fee, memo, createMessage, params) => {
  const privateKey = Buffer.from(privateKeyHex.replace("0x", ""), "hex");
  const wallet = new Wallet(privateKey);
  const address = ethToEvmos(wallet.address);
  const account = await authAccount(address);
  const sender = {
    accountAddress: address,
    sequence: account.account.base_account.sequence,
    accountNumber: account.account.base_account.account_number,
    pubkey: Buffer.from(wallet._signingKey().compressedPublicKey.replace("0x", ""), "hex").toString("base64"),
  };

  const msg = createMessage(chain, sender, fee, memo, params);
  const signature = signTypedData({
    privateKey,
    data: msg.eipToSign,
    version: "V4",
  });

  let extension = signatureToWeb3Extension(chain, sender, signature);
  let rawTx = createTxRawEIP712(msg.legacyAmino.body, msg.legacyAmino.authInfo, extension);
  let txBytes = JSON.parse(generatePostBodyBroadcast(rawTx)).tx_bytes;
  return "0x" + Buffer.from(txBytes).toString("hex");
};

console.log("api/faucet start", provider, chainId, cosmosChainId, hexPrivateKey, value, govValue, gasPrice, gas, ipMax);

export default async function handler(req, res) {
  const { body, headers } = req;
  const { to, id } = body;
  const ip = headers["cf-connecting-ip"] || "127.0.0.1";
  const date = dayjs().format("YYYYMMDD");
  const item = ip.toLowerCase() + "_" + id.toLowerCase() + "_" + to.toLowerCase();
  if (faucet == undefined) {
    try {
      await fs.ensureDir(db);
      faucet = await fs.readJson(db + date + ".json");
    } catch (error) {}
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
    if (ret.to >= addressMax) {
      return res.status(200).json({ msg: `A maximum of ${addressMax} withdrawals per day are allowed`, code: 401 });
    } else if (ret.ip >= ipMax || ret.id >= ipMax) {
      return res.status(200).json({ msg: `One IP address can be received for a maximum of ${ipMax} times a day`, code: 400 });
    }

    let data;
    let code = 0;
    let msg = "success";
    if (to.indexOf("evmos") == 0) {
      const chain = {
        chainId,
        cosmosChainId,
      };

      let fee = {
        amount: "210000",
        denom: "aevmos",
        gas: "2000000000",
      };

      const memo = "faucet";
      const params = {
        destinationAddress: to,
        amount: govValue,
        denom: "agov",
      };
      const hexBytes = await txHexBytes(hexPrivateKey, chain, fee, memo, createMessageSend, params);
      data = await txCommit(hexBytes);
      if (data?.check_tx?.code != 0) {
        code = data?.check_tx?.code;
        msg = data?.check_tx?.log;
      }
      if (code == 0 && data?.deliver_tx?.code != 0) {
        code = data?.check_tx?.code;
        msg = data?.check_tx?.log;
      }
    } else {
      const nonce = await web3.eth.getTransactionCount(account.address);
      const message = {
        from,
        to,
        gas,
        gasPrice,
        nonce,
        value,
        chainId,
      };
      const transaction = await account.signTransaction(message);
      data = await web3.eth.sendSignedTransaction(transaction.rawTransaction);
    }

    faucet.items.push(item);
    await fs.writeJSON(db + faucet.date + ".json", faucet);
    res.status(200).json({ msg, data, code });
  } catch (error) {
    console.error(error);
    res.status(200).json({ msg: "sendSignedTransaction fail, try", code: 402 });
  }
}
