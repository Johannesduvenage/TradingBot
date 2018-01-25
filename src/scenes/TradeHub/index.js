import React, { Component } from 'react';
import './styles.css';

// Libraries
import binance from 'binance-api';
import { Container, Row, Col } from 'reactstrap';

// Components
import Header from '../../components/Header';
import HorizontalTabList from '../../components/HorizontalTabList';
import InfoPanel from '../../components/InfoPanel';
import InputPanel from '../../components/InputPanel';
import OptionPanel from '../../components/OptionPanel';
import Chart from '../../components/Chart';

class TradeHub extends Component {

  state = {
    cryptoList: [],
    selectedCrypto: {symbol:"ETHBTC", baseAsset:"ETH", quoteAsset:"BTC"},
    currentPrice: 0,
    boughtPrice: 0,
    diffPercentage: 0.01,
    highestPrice: 0,
    messages: [],
    sellEnabled: false,
    hasSold: false,
    socketKeys: ["ETHBTC@kline_1m"]
  }

  componentDidMount = () => {
    binance.options({
      'APIKEY':      this.props.opts.binance.key,
      'APISECRET':   this.props.opts.binance.secret,
      'reconnect': false
    });

    this.getCryptoList();
    this.bindSocket(this.state.selectedCrypto.symbol);
  }

  rebindSocket = () => {
    const newCrypto = this.state.selectedCrypto.symbol;
    const newEndpoint = newCrypto.toLowerCase() + "@kline_1m";
    const subscriptions = binance.websockets.subscriptions();

    for (let endpoint in subscriptions) {
      if (endpoint !== newEndpoint) { this.removeSocket(endpoint); }
    }

    this.bindSocket(newCrypto);
  }

  removeSocket = (endpoint) => {
    binance.websockets.terminate(endpoint);
  }

  bindSocket = (symbol) => {
    binance.websockets.candlesticks([symbol], "1m", (candlesticks) => {
      const { k:ticks } = candlesticks;
      const { c:close } = ticks;
      const currentPrice = parseFloat(close);

      this.setState({currentPrice});
      this.checkPrice(currentPrice);
    });
  }

  getCryptoList = () => {
    fetch('https://api.binance.com/api/v1/exchangeInfo').then(res => res.json()).then((data) => {
      const cryptoList = data.symbols;
      if (cryptoList.length > 0) {
        this.setState({
          cryptoList,
          selectedCrypto: cryptoList[0]
        });
      }
    });
  }

  checkPrice = (price) => {
    if (price > this.state.boughtPrice) {
      if (this.isHighestPrice(price)) {
        this.setHighestPrice(price);
        return;
      }

      if (this.shouldSell(price)) {
        this.sell(price);
      }
    }
  }

  isHighestPrice = (price) => {
    return price > this.state.highestPrice;
  }

  setHighestPrice = (price) => {
    this.setState({
      highestPrice: price
    });
  }

  shouldSell = (price) => {
    const { sellEnabled, hasSold, highestPrice, diffPercentage } = this.state;
    if (sellEnabled && !hasSold) {
      return price <= highestPrice - highestPrice * diffPercentage;
    }
  }

  sell = (price) => {
    alert("SOLD at: " + price);
    this.setState({
      hasSold: true
    });
  }

  setBoughtPrice = (price) => {
    this.setState({
      boughtPrice: price
    });
  }

  setDiffPercentage = (percentage) => {
    const diffPercentage = percentage / 100;
    this.setState({
      diffPercentage
    });
  }

  setSellEnabled = (value) => {
    this.setState({
      sellEnabled: value
    });
  }

  changeSelectedCrypto = (symbol) => {
    const crypto = this.state.cryptoList.find(obj => obj.symbol === symbol);
    if (crypto === null) return;

    binance.prices((ticker) => {
      const currentPrice = parseFloat(ticker[crypto.symbol]);
      this.setState({
        currentPrice,
        sellEnabled: false,
        highestPrice: currentPrice
      });
    });

    this.setState({
      selectedCrypto: crypto
    },() => this.rebindSocket());
  }

  render = () => {
    const {sellEnabled, selectedCrypto, cryptoList, boughtPrice } = this.state;
    const diffPercentage = this.state.diffPercentage * 100;
    const currentPrice = this.state.currentPrice.toFixed(6);
    const highestPrice = this.state.highestPrice.toFixed(6);
    const sellPrice = (highestPrice - highestPrice * this.state.diffPercentage).toFixed(6);

    const sellOptions = [
      {
        label: "Enable",
        value: true,
        color: "success"
      },
      {
        label: "Disable",
        value: false,
        color: "danger"
      }
    ]

    return (
      <div>
        <Header />

        <Container>
          <HorizontalTabList list={cryptoList} selectedItem={this.state.selectedCrypto} changeSelected={this.changeSelectedCrypto}/>
          <Row>
            <Col>
              <InputPanel
                name="bought_price"
                value={boughtPrice}
                step="0.01"
                onChange={this.setBoughtPrice}
                title="Bought"
                description={"Price in " + selectedCrypto.quoteAsset + " at which you bought " + selectedCrypto.baseAsset}
                placeholder="Bought price"/>
            </Col>

            <Col>
              <InputPanel
                name="diffpercentage"
                value={diffPercentage}
                step="0.01"
                onChange={this.setDiffPercentage}
                title="Difference"
                description={"% between highestprice and sell price."}
                placeholder="Difference %"/>
            </Col>

            <Col>
              <OptionPanel
                options={sellOptions}
                value={sellEnabled}
                onChange={this.setSellEnabled}
                title="Should sell"
                description={"If the bot should sell at " + sellPrice} />
            </Col>
          </Row>
        </Container>

        <Container className="mt-3">
          <Row>
            <Col><Chart selectedCrypto={this.state.selectedCrypto} /></Col>
          </Row>
        </Container>

        <Container className="mt-3">
          <Row>
            <Col><InfoPanel title={selectedCrypto.quoteAsset + " " + currentPrice} description={selectedCrypto.baseAsset + " current price"}/></Col>
            <Col><InfoPanel title={selectedCrypto.quoteAsset + " "  + highestPrice} description={selectedCrypto.baseAsset + " hightest price since bought"}/></Col>
            <Col><InfoPanel title={selectedCrypto.quoteAsset + " "  + sellPrice} description={selectedCrypto.baseAsset + " price to sell on"}/></Col>
          </Row>
        </Container>

        <div>
          <hr/>
          <p>(only when the price is higher then the boughtPrice). <br/>
            Difference between highestprice and sell price is {(this.state.diffPercentage * 100).toFixed(2)}%</p>
          <h1>Sold: {this.state.hasSold.toString()}</h1>
        </div>
      </div>
    )
  }
}

export default TradeHub;
