import { Col, Image, Row } from "antd";
import styles from "./foot.module.css";

const smallDevice = () => {
  const u = navigator.userAgent;
  const device = {
    //移动终端浏览器版本信息
    trident: u.indexOf("Trident") > -1, //IE内核
    presto: u.indexOf("Presto") > -1, //opera内核
    webKit: u.indexOf("AppleWebKit") > -1, //苹果、谷歌内核
    gecko: u.indexOf("Gecko") > -1 && u.indexOf("KHTML") == -1, //火狐内核
    mobile: !!u.match(/AppleWebKit.*Mobile.*/), //是否为移动终端
    ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端
    android: u.indexOf("Android") > -1 || u.indexOf("Linux") > -1, //android终端或uc浏览器
    iPhone: u.indexOf("iPhone") > -1, //是否为iPhone或者QQHD浏览器
    iPad: u.indexOf("iPad") > -1, //是否iPad
    webApp: u.indexOf("Safari") == -1, //是否web应该程序，没有头部与底部
  };

  if ((device.mobile && !device.iPad) || (screen && screen.availWidth < 768)) {
    return true;
  }
  return false;
};

export default function Foot() {
  return (
    <div className={smallDevice() ? styles.mbbg : styles.bg}>
      <div style={{ width: smallDevice() ? "100%" : "80%", margin: smallDevice() ? "0px 0px 0px 20px" : "0 auto" }}>
        <Row gutter={[0, 0]}>
          <Col span={smallDevice() ? 24 : 8}>
            <div style={{ marginTop: "40px", height: "50px" }}>
              <div className={styles.img}>{/* <Image width={176} height={40} src="/images/nelo2.png" preview={false} /> */}</div>
            </div>
            <div className={styles.chain}>Copyright © 2023 Quarix Pte Ltd</div>
            <div className={styles.chain}>All rights reserved</div>
          </Col>
          <Col span={smallDevice() ? 24 : 8}>
            <div className={styles.about}>About us</div>
            <div className={styles.chain}>Knowledge Base</div>
            <div className={styles.chain}>About us</div>
            <div className={styles.chain}>Terms of Service</div>
          </Col>
          <Col span={smallDevice() ? 24 : 8}>
            <div className={styles.about}>Social Media</div>
            <div className={styles.pic} style={{ padding: "15px 0px 0px 8px", float: "left" }}>
              <Image width={28} height={18} src="/images/email.png" preview={false} />
            </div>
            <div className={styles.pic} style={{ padding: "12px 0px 0px 10px", float: "left", marginLeft: "10px" }}>
              <Image width={24} height={22} src="/images/robot.png" preview={false} />
            </div>
            <div className={styles.pic} style={{ padding: "15px 0px 0px 10px", float: "left", marginLeft: "10px" }}>
              <Image width={23} height={19} src="/images/twitter.png" preview={false} />
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
}
