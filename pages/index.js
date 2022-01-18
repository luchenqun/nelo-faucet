import React, { Component } from 'react'
import axios from 'axios';
import dayjs from "dayjs";
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Layout, Image, message, Button, Col, Row, Card, Input, Spin } from 'antd';
import { FacebookOutlined, GithubOutlined, TwitterOutlined, WeiboOutlined, GooglePlusOutlined } from '@ant-design/icons';
const { Header, Content, Footer } = Layout;
import Foot from '../components/foot'

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
    inputAddress: ''
  }
  id = ""

  async componentDidMount() {
    try {
      const load = await FingerprintJS.load()
      const result = await load.get();
      console.log("visitorId", result.visitorId)
      this.id = result.visitorId.toLowerCase()
    } catch (error) {
      this.id = dayjs().format("yyyyMMdd")
    }

    // window.AWSC.use("nc", function (state, module) {
    //   // 初始化
    //   window.nc = module.init({
    //     // 应用类型标识。它和使用场景标识（scene字段）一起决定了滑动验证的业务场景与后端对应使用的策略模型。您可以在阿里云验证码控制台的配置管理页签找到对应的appkey字段值，请务必正确填写。
    //     appkey: "CF_APP_1",
    //     //使用场景标识。它和应用类型标识（appkey字段）一起决定了滑动验证的业务场景与后端对应使用的策略模型。您可以在阿里云验证码控制台的配置管理页签找到对应的scene值，请务必正确填写。
    //     scene: "register",
    //     // 声明滑动验证需要渲染的目标ID。
    //     renderTo: "nc",
    //     width: "450",
    //     language: "en",
    //     test: module.TEST_PASS,
    //     //前端滑动验证通过时会触发该回调参数。您可以在该回调参数中将会话ID（sessionId）、签名串（sig）、请求唯一标识（token）字段记录下来，随业务请求一同发送至您的服务端调用验签。
    //     success: function (data) {
    //       window.console && console.log(data.sessionId)
    //       window.console && console.log(data.sig)
    //       window.console && console.log(data.token)
    //     },
    //     // 滑动验证失败时触发该回调参数。
    //     fail: function (failCode) {
    //       window.console && console.log(failCode)
    //     },
    //     // 验证码加载出现异常时触发该回调参数。
    //     error: function (errorCode) {
    //       window.console && console.log(errorCode)
    //     }
    //   });
    // })
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
        <Spin tip="In the transaction......" spinning={loading}>
          <div className="header-logo">
            <Image preview={false} width={182} height={35} src="/images/nelo.png" />
            <div style={{ float: "right" }}>
              <a style={{ fontSize: "20px", fontFamily: "Microsoft YaHei" }} rel="noreferrer" href="https://nsctestnetscan.nelo.world/" target="_blank">Scan&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</a>
              <a style={{ fontSize: "20px", fontFamily: "Microsoft YaHei" }} rel="noreferrer" href="https://nsctestnetdapp.nelo.world/" target="_blank">Blind Box&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</a>
              <a style={{ fontSize: "20px", fontFamily: "Microsoft YaHei" }} rel="noreferrer" href="https://nsctestnetdapp.nelo.world/farms" target="_blank">Farms&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</a>
            </div>
          </div>
          <Row type="flex" justify="center" align="middle" className='content'>
            <Col style={{ minWidth: '500px', maxWidth: '500px' }}>
              <Card title="NSC TESTNET FAUCET" bordered={true}>
                <Input ref={c => this.inputAddress = c} size="large" placeholder="Input you address" allowClear style={{ marginBottom: "15px" }} />
                <div style={{ margin: "12px 0px" }}>
                  <div onClick={this.send} className="send">Requset 10 Nelo</div>
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