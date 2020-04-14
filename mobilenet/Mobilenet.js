import React, { useState, useEffect, Component } from 'react'
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-react-native'

import {CLASSES} from './class_names.js';

const MODEL_FILE_URL = 'http://tfjs-models-bucket.s3-eu-west-1.amazonaws.com/mobilenet_v2/model.json';
const INPUT_NODE_NAME = 'input_1';
const OUTPUT_NODE_NAME = 'Identity';
const IMAGE_SIZE = 224
import 'react-native-console-time-polyfill';

class MobileNet extends React.PureComponent  {
  constructor() {
    super();
    this.load = this.load.bind(this)
    this.dispose = this.dispose.bind(this)
    this.predict = this.predict.bind(this)
    this.getTopKClasses = this.getTopKClasses.bind(this)
    this.model = null;
  }

  componentDidMount() {
    this.props.parentCallback(this)
  }

  render() {
    return null
  }

  async load() {
    await tf.ready();
    if (!this.model) {
      this.model = await tf.loadGraphModel(MODEL_FILE_URL);
      // Warmup the model. This isn't necessary, but makes the first prediction
      // faster. Call `dispose` to release the WebGL memory allocated for the return
      // value of `predict`.
      this.getTopKClasses(this.predict(tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3])));
    }
  }

  performance_test() {
    console.time("Predict");
    this.getTopKClasses(this.predict(tf.randomNormal([1, IMAGE_SIZE, IMAGE_SIZE, 3], mean = 0, stddev = 1.0)));
    console.timeEnd("Predict");
  }

  dispose() {
    if (this.model) {
      console.log("MobileNet dispose model");
      this.model.dispose();
      this.model = null
    }
  }
  /**
   * Infer through MobileNet. This does standard ImageNet pre-processing before
   * inferring through the model. This method returns named activations as well
   * as softmax logits.
   *
   * @param input un-preprocessed input Array.
   * @return The softmax logits.
   */
  predict(input) {
    const offset = tf.scalar(127.5);
    const resized = tf.image.resizeBilinear(input, [IMAGE_SIZE, IMAGE_SIZE])
    // normalize range to [-1,1]
    const normalized = resized.sub(offset).div(offset);
    // Reshape to a single-element batch so we can pass it to predict.
    const reshapedInput = normalized.reshape([-1, IMAGE_SIZE, IMAGE_SIZE, 3]);
    // return this.model.predict(batched)
    return this.model.execute({ [INPUT_NODE_NAME]: reshapedInput }, OUTPUT_NODE_NAME);
  }

  getTopKClasses(logits, topK) {
    const predictions = tf.tidy(() => {
      return tf.softmax(logits);
    });

    const values = predictions.dataSync();
    predictions.dispose();

    let predictionList = [];
    // console.log("Prediction: " + values);
    for (let i = 0; i < values.length; i++) {
      predictionList.push({ value: values[i], index: i });
    }
    predictionList = predictionList
      .sort((a, b) => {
        return b.value - a.value;
      })
      .slice(0, topK);

    return predictionList.map(x => {
      return { label: CLASSES[x.index], value: x.value };
    });
  }
}

export default MobileNet;