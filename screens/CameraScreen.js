import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native'
import * as tf from '@tensorflow/tfjs'
import { cameraWithTensors } from '@tensorflow/tfjs-react-native'
import Constants from 'expo-constants'
import * as Permissions from 'expo-permissions'
import { Camera } from 'expo-camera';
import MobileNet from '../mobilenet/Mobilenet'
import 'react-native-console-time-polyfill';

const IMAGE_SIZE = 224

const MIN_PROBABILITY = 0.5;
const PREDICTION_INTERVAL = 60;

const TensorCamera = cameraWithTensors(Camera);

/* Format percent utility function */
function percentFormat(num) {
  return (num * 100).toFixed(0) + '%'
}

/* Request for camera permission */
async function getPermissionAsync() {
  if (Constants.platform.ios) {
    const { status } = await Permissions.askAsync(Permissions.CAMERA)
    if (status !== 'granted') {
      alert('Need camera permission to identify pictures as you go')
    }
  }
}

export default class CameraScreen extends React.Component {
  state = {
    loadingComplete: false
    , cameraType: Camera.Constants.Type.back
    , predictions: []
    , classes: 0
  }

  frame_id = 0;

  constructor() {
    super();
  }

  loadModel = async () => {
    try {
      console.time("Loading model");
      await this.modelwrapper.load();
      this.setState({ loadingComplete: true });
    } catch (e) {
      console.error(e);
    } finally {
      console.timeEnd("Loading model");
    }
  }

  updateModelWrapper = async (model) => {
    // Call only once
    if (!this.modelwrapper) {
      this.modelwrapper = model;
      await this.loadModel();
    }
  }

  async componentDidMount() {
    try {
      getPermissionAsync();
    } catch (e) {
      console.error(e);
    }
  }

  handleCameraStream = (images, updatePreview, gl) => {
    let last_classify_ts = 0;
    const loop = async () => {
      this.frame_id++;
      let current_ts = Date.now();
      if (this.frame_id % PREDICTION_INTERVAL == 0) {
        const imageTensor = images.next().value
        if (imageTensor) {
          const start_prediction = Date.now();
          console.time("predict")
          let prediction = this.modelwrapper.predict(imageTensor)
          console.timeEnd("predict")
          if (prediction) {
            const p = this.modelwrapper.getTopKClasses(prediction, 1).filter(p => p.value >= MIN_PROBABILITY);
            const prediction_time = Date.now() - start_prediction
            tf.dispose([imageTensor]);
            if ((p && p.length > 0) || (current_ts - last_classify_ts) > 10000) {
              last_classify_ts = Date.now();
              this.setState({ predictions: p, classes: p.length });
            }
          }
        }
      }
      requestAnimationFrame(loop);
    }
    try {
      loop();
    } catch (error) {
      console.error(error)
    }
  }

  renderPrediction = prediction => {
    return (
      <Text key={prediction.label} style={styles.text}>
        {prediction.label + " " + percentFormat(prediction.value)}
      </Text>
    )
  }


  renderInitializing = () => {
    return (
      <View style={styles.viewWrapper}>
        <Text style={styles.initializingText}>
          Initializing
        </Text>
        <ActivityIndicator size='large' />
      </View>
    )
  }

  renderTensorCamera = () => {
    return (
      <TensorCamera
        style={styles.camera}
        type={this.state.cameraType}
        cameraTextureHeight={styles.textureDims.height}
        cameraTextureWidth={styles.textureDims.width}
        resizeHeight={IMAGE_SIZE}
        resizeWidth={IMAGE_SIZE}
        resizeDepth={3}
        onReady={this.handleCameraStream}
        autorender={false}>
        <View style={styles.predictionWrapper}>
          {this.state.classes ?
            this.state.predictions.map(p => this.renderPrediction(p)) :
            <Text style={styles.text}>Unkown</Text>}
        </View>
      </TensorCamera>
    )
  }

  render() {
    return (
      <View style={styles.viewWrapper}>
        <MobileNet parentCallback={this.updateModelWrapper} />
        {this.state.loadingComplete ? this.renderTensorCamera() : this.renderInitializing()}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  viewWrapper: {
    flex: 1,
    flexDirection: "row"
  },
  camera: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 15,
  },
  optionIconContainer: {
    marginRight: 12,
  },
  option: {
    backgroundColor: '#fdfdfd',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: '#ededed',
  },
  lastOption: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 15,
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  initializingText: {
    fontSize: 32,
    fontWeight: '200',
    top: '50%',
    left: '15%',
    alignContent: 'center',
    flex: 0.5,
  },
  predictionWrapper: {
    fontSize: 18,
    alignItems: 'center',
    color: 'white',
    top: "80%",
    flex: 0.2,
  },
  text: {
    color: '#ffffff',
    textAlign: "center",
    margin: 20,
    fontSize: 18
  },
  textureDims: {
    height: Platform.OS === 'ios' ? 1920 : 1200,
    width: Platform.OS === 'ios' ? 1080 : 1600,
  }
});
