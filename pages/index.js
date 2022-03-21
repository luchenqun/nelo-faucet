import React, { Component } from 'react'
import axios from 'axios';
import dayjs from "dayjs";
import dynamic from 'next/dynamic';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Image, message, Col, Row, Card, Input, Spin } from 'antd';
import Head from 'next/head'
const Foot = dynamic(
  import('../components/foot'),
  { ssr: false }
);


const sleep = time => {
  return new Promise(resolve => setTimeout(resolve, time));
}

export default class App extends Component {
  state = {
    loading: false,
    to: '',
    hash: '',
    err: '',
    result: false,
    inputAddress: '',
    smallDevice: false
  }
  id = ""

  async componentDidMount() {
    try {
      const smallDevice = () => {
        const u = window.navigator.userAgent;
        const device = { //移动终端浏览器版本信息
          trident: u.indexOf('Trident') > -1, //IE内核
          presto: u.indexOf('Presto') > -1, //opera内核
          webKit: u.indexOf('AppleWebKit') > -1, //苹果、谷歌内核
          gecko: u.indexOf('Gecko') > -1 && u.indexOf('KHTML') == -1, //火狐内核
          mobile: !!u.match(/AppleWebKit.*Mobile.*/), //是否为移动终端
          ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端
          android: u.indexOf('Android') > -1 || u.indexOf('Linux') > -1, //android终端或uc浏览器
          iPhone: u.indexOf('iPhone') > -1, //是否为iPhone或者QQHD浏览器
          iPad: u.indexOf('iPad') > -1, //是否iPad
          webApp: u.indexOf('Safari') == -1 //是否web应该程序，没有头部与底部
        };

        if ((device.mobile && !device.iPad) || (screen && screen.availWidth < 768)) {
          return true;
        }

        return false;
      }
      const load = await FingerprintJS.load()
      const result = await load.get();
      console.log("visitorId", result.visitorId)
      this.id = result.visitorId.toLowerCase()
      this.setState({ smallDevice: smallDevice() })
    } catch (error) {
      this.id = dayjs().format("yyyyMMdd")
    }
  }

  send = async () => {
    const { value } = this.inputAddress.state
    let to = value

    if (!to) {
      message.error("Please enter an address")
      return
    } else if (!/^(0x)?[0-9a-f]{40}$/i.test(to)) {
      message.error(to + " it's not a valid address")
      return
    }

    this.setState({ loading: true, result: false })
    let hash = ""
    let err = ""
    await sleep(100)
    try {
      const reply = await axios.post(`/api/faucet`, { to, id: this.id })
      const { status, statusText, data } = reply
      if (status === 200) {
        const { code, msg } = data
        if (code === 0) {
          message.success("successfully send 10 nelo to " + to, 30)
        } else {
          err = msg
          message.error(msg)
        }
      } else {
        err = statusText
        message.error("a error happen:" + statusText)
      }
      console.log(data)
    } catch (error) {
      err = typeof error == "string" ? error : "a error happen"
      message.error("a error happen, please try again later")
      console.log(error)
    }
    this.setState({ loading: false, to, hash, err, result: true })
  }

  render() {
    const { loading, result, err } = this.state
    return (
      <div className='app'>
        <Head>
          <title>NSC TESTNET FAUCET</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no"></meta>
        </Head>
        <Spin tip="In the transaction......" spinning={loading}>
          <div className={this.state.smallDevice ? 'mobile-header-logo' : 'header-logo'}>
            {
              this.state.smallDevice ? <Image preview={false} width={38} height={35} src="/images/n.jpg" /> : <Image preview={false} width={182} height={35} src="/images/nelo.png" />
            }
            <div style={{ float: "right" }}>
              <a style={{ fontSize: "20px", fontFamily: "Microsoft YaHei", paddingRight: this.state.smallDevice ? "20px" : "60px" }} rel="noreferrer" href="https://analysis.nelo.network/" target="_blank">Scan</a>
              <a style={{ fontSize: "20px", fontFamily: "Microsoft YaHei", paddingRight: this.state.smallDevice ? "20px" : "60px" }} rel="noreferrer" href="https://nsctestnetdapp.nelo.network/" target="_blank">Blind Box</a>
              <a style={{ fontSize: "20px", fontFamily: "Microsoft YaHei", paddingRight: this.state.smallDevice ? "20px" : "60px" }} rel="noreferrer" href="https://nsctestnetdapp.nelo.network/farms" target="_blank">Farms</a>
            </div>
          </div>
          <Row type="flex" justify="center" align="middle" className='content'>
            <Col style={{ minWidth: this.state.smallDevice ? '100%' : '500px', maxWidth: '500px' }}>
              <Card title="NSC TESTNET FAUCET" bordered={true}>
                <Input ref={c => this.inputAddress = c} size="large" placeholder="Input your address" allowClear style={{ marginBottom: "15px", height: "46px" }} />
                <div style={{ margin: "12px 0px" }}>
                  <div onClick={this.send} className="send">Request 10 Nelo</div>
                </div>
              </Card>
            </Col>
          </Row>
          <Foot></Foot>
        </Spin>
      </div>
    )
  }
}