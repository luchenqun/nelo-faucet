import React, { Component } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Layout, Image, message, Col, Row, Card, Input, Spin } from 'antd';
import Foot from '../components/foot';

const sleep = (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

const showMessageWithLink = (to, hash) => {
  const link = 'https://scan.ethos.cool/tx/' + hash;
  const content = (
    <span>
      Success send 10 ETHOS to {to}, more detail see
      <a rel="noreferrer" href={link} target="_blank" style={{ color: 'blue' }}>
        &nbsp;EthosScan
      </a>
    </span>
  );

  message.success({
    content,
    duration: 30,
  });
};
export default class App extends Component {
  state = {
    loading: false,
    to: '',
    hash: '',
    err: '',
    result: false,
    inputAddress: '',
  };
  id = '';

  async componentDidMount() {
    try {
      const load = await FingerprintJS.load();
      const result = await load.get();
      console.log('visitorId', result.visitorId);
      this.id = result.visitorId.toLowerCase();
    } catch (error) {
      this.id = dayjs().format('yyyyMMdd');
    }
  }

  send = async () => {
    let { value: to } = this.inputAddress.input;
    if (!to) {
      message.error('Please enter an address');
      return;
    } else if (!/^(0x)?[0-9a-f]{40}$/i.test(to)) {
      message.error(to + " it's not a valid address");
      return;
    }

    this.setState({ loading: true, result: false });
    let hash = '';
    let err = '';

    try {
      const reply = await axios.post(`/api/faucet`, { to, id: this.id });
      const { status, statusText, data } = reply;
      if (status === 200) {
        const { code, msg } = data;
        if (code === 0) {
          showMessageWithLink(to, data.data.hash);
        } else {
          err = msg;
          message.error(msg);
        }
      } else {
        err = statusText;
        message.error('a error happen:' + statusText);
      }
    } catch (error) {
      err = typeof error == 'string' ? error : 'a error happen';
      message.error('a error happen, please try again later');
      console.log(error);
    }
    this.setState({ loading: false, to, hash, err, result: true });
  };

  render() {
    const { loading, result, err } = this.state;
    return (
      <div className="app">
        <Spin tip="In the transaction......" spinning={loading}>
          <div className="header-logo">
            <Image preview={false} width={72} height={72} src="/images/coin-faucet.png" alt="Ethos fuacet" />
            <div style={{ float: 'right', marginTop: '18px' }}>
              <a
                style={{ fontSize: '20px', fontFamily: 'Microsoft YaHei' }}
                rel="noreferrer"
                href="https://scan.ethos.cool/"
                target="_blank">
                Scan&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              </a>
              <a
                style={{ fontSize: '20px', fontFamily: 'Microsoft YaHei' }}
                rel="noreferrer"
                href="https://bridge.ethos.cool/"
                target="_blank">
                Bridge&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              </a>
              <a
                style={{ fontSize: '20px', fontFamily: 'Microsoft YaHei' }}
                rel="noreferrer"
                href="https://swap.ethos.cool"
                target="_blank">
                Uniswap&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              </a>
              <a
                style={{ fontSize: '20px', fontFamily: 'Microsoft YaHei' }}
                rel="noreferrer"
                href="https://app.ethos.cool"
                target="_blank">
                App&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              </a>
            </div>
          </div>
          <Row type="flex" justify="center" align="middle" className="content">
            <Col style={{ minWidth: '500px', maxWidth: '500px' }}>
              <Card title="ETHOS CHAIN FAUCET" bordered={true}>
                <Input
                  ref={(c) => (this.inputAddress = c)}
                  size="large"
                  placeholder="Input your address"
                  allowClear
                  style={{ marginBottom: '15px' }}
                />
                <div style={{ margin: '12px 0px' }}>
                  <div onClick={this.send} className="send">
                    Request 10 ETHOS
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
          <Foot></Foot>
        </Spin>
      </div>
    );
  }
}
