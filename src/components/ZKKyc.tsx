'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Camera, Loader2, Upload } from 'lucide-react';
import cv from '@techstark/opencv-js';
import { KycUtils } from '@/lib/kyc';

export function ZKKyc() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isOpenCamera, setIsOpenCamera] = useState(false);
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const netDetRef = useRef<any>(null);
  const netRecognRef = useRef<any>(null);

  // OpenCV 实例和视频捕获相关引用
  const frameRef = useRef<any>(null);
  const frameBGRRef = useRef<any>(null);
  const capRef = useRef<any>(null);

  const uploadedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          if (uploadedCanvasRef.current) {
            const canvas = uploadedCanvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // 计算保持宽高比的尺寸
              const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
              const newWidth = img.width * ratio;
              const newHeight = img.height * ratio;

              // 计算居中位置
              const offsetX = (canvas.width - newWidth) / 2;
              const offsetY = (canvas.height - newHeight) / 2;

              // 清除画布并绘制新图像
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, offsetX, offsetY, newWidth, newHeight);
            }
          }
        };
        img.src = reader.result as string;
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.setAttribute('width', canvasRef.current?.width?.toString() || '640');
        videoRef.current.setAttribute('height', canvasRef.current?.height?.toString() || '480');
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = function () {
          videoRef.current?.play();
        };
        setIsRunning(true);
      }
    } catch (err) {
      console.error('Error accessing the camera', err);
    }
  }, []);

  const processFrames = () => {
    if (!isRunning) return;

    const begin = Date.now();

    const width = videoRef.current?.width;
    const height = videoRef.current?.height;
    console.log(width, height);

    // 初始化或获取 frame 和 frameBGR
    if (!frameRef.current) {
      
      frameRef.current = new cv.Mat(height, width, cv.CV_8UC4);
    }
    if (!frameBGRRef.current) {
      frameBGRRef.current = new cv.Mat(height, width, cv.CV_8UC3);
    }

    // 初始化视频捕获
    if (!capRef.current) {
      capRef.current = new cv.VideoCapture(videoRef.current!);
    }

    // 读取和处理帧
    capRef.current.read(frameRef.current);
    cv.cvtColor(frameRef.current, frameBGRRef.current, cv.COLOR_RGBA2BGR);

    // 检测人脸
    const faces = detectFaces(frameBGRRef.current);

    // 绘制人脸框和关键点
    faces.forEach((rect) => {
      cv.rectangle(
        frameRef.current,
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        [0, 255, 0, 255]
      );

      // 绘制关键点
      const keypoints = [
        { x: rect.x1, y: rect.y1, color: [255, 0, 0, 255] },
        { x: rect.x2, y: rect.y2, color: [0, 0, 255, 255] },
        { x: rect.x3, y: rect.y3, color: [0, 255, 0, 255] },
        { x: rect.x4, y: rect.y4, color: [255, 0, 255, 255] },
        { x: rect.x5, y: rect.y5, color: [0, 255, 255, 255] }
      ];

      keypoints.forEach((point) => {
        if (point.x > 0 && point.y > 0) {
          cv.circle(frameRef.current, { x: point.x, y: point.y }, 2, point.color, 2);
        }
      });

      // 添加标签
      cv.putText(frameRef.current, 'unknown', { x: rect.x, y: rect.y }, cv.FONT_HERSHEY_SIMPLEX, 1.0, [0, 255, 0, 255]);
    });

    // 显示结果
    cv.imshow(canvasRef.current!, frameRef.current);

    // 计算下一帧的延迟时间
    const delay = Math.max(0, 1000 / 30 - (Date.now() - begin));
    setTimeout(processFrames, delay);
  };

  useEffect(() => {
    if (isRunning) {
      processFrames();
    }
  }, [isRunning]);

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      if (frameRef.current) {
        frameRef.current.delete();
        frameRef.current = null;
      }
      if (frameBGRRef.current) {
        frameBGRRef.current.delete();
        frameBGRRef.current = null;
      }
      if (capRef.current) {
        capRef.current = null;
      }
      // 停止视频流
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 人脸检测函数
  const detectFaces = (img: cv.Mat) => {
    netDetRef.current!.setInputSize(new cv.Size(img.cols, img.rows));
    const out = new cv.Mat();
    netDetRef.current.detect(img, out);
    const faces = [];

    for (var i = 0, n = out.data32F.length; i < n; i += 15) {
      var left = out.data32F[i];
      var top = out.data32F[i + 1];
      var right = out.data32F[i] + out.data32F[i + 2];
      var bottom = out.data32F[i + 1] + out.data32F[i + 3];
      left = Math.min(Math.max(0, left), img.cols - 1);
      top = Math.min(Math.max(0, top), img.rows - 1);
      right = Math.min(Math.max(0, right), img.cols - 1);
      bottom = Math.min(Math.max(0, bottom), img.rows - 1);

      if (left < right && top < bottom) {
        faces.push({
          x: left,
          y: top,
          width: right - left,
          height: bottom - top,
          x1: out.data32F[i + 4] < 0 || out.data32F[i + 4] > img.cols - 1 ? -1 : out.data32F[i + 4],
          y1: out.data32F[i + 5] < 0 || out.data32F[i + 5] > img.rows - 1 ? -1 : out.data32F[i + 5],
          x2: out.data32F[i + 6] < 0 || out.data32F[i + 6] > img.cols - 1 ? -1 : out.data32F[i + 6],
          y2: out.data32F[i + 7] < 0 || out.data32F[i + 7] > img.rows - 1 ? -1 : out.data32F[i + 7],
          x3: out.data32F[i + 8] < 0 || out.data32F[i + 8] > img.cols - 1 ? -1 : out.data32F[i + 8],
          y3: out.data32F[i + 9] < 0 || out.data32F[i + 9] > img.rows - 1 ? -1 : out.data32F[i + 9],
          x4: out.data32F[i + 10] < 0 || out.data32F[i + 10] > img.cols - 1 ? -1 : out.data32F[i + 10],
          y4: out.data32F[i + 11] < 0 || out.data32F[i + 11] > img.rows - 1 ? -1 : out.data32F[i + 11],
          x5: out.data32F[i + 12] < 0 || out.data32F[i + 12] > img.cols - 1 ? -1 : out.data32F[i + 12],
          y5: out.data32F[i + 13] < 0 || out.data32F[i + 13] > img.rows - 1 ? -1 : out.data32F[i + 13],
          confidence: out.data32F[i + 14]
        });
      }
    }

    out.delete();
    return faces;
  };

  const float32ArrayToUint8Array = (float32Array: Float32Array): Uint8Array => {
    const uint8Data = new Uint8Array(float32Array.length * 4);
    for (let i = 0; i < float32Array.length; i++) {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      view.setFloat32(0, float32Array[i], true); // true for little-endian
      uint8Data.set(new Uint8Array(buffer), i * 4);
    }
    return uint8Data;
  };

  const uint8ArrayToFloat32Array = (uint8Array: Uint8Array): Float32Array => {
    if (uint8Array.length % 4 !== 0) {
      throw new Error('Input array length must be a multiple of 4');
    }
    
    const float32Array = new Float32Array(uint8Array.length / 4);
    const buffer = uint8Array.buffer;
    const view = new DataView(buffer);
    
    for (let i = 0; i < uint8Array.length; i += 4) {
      float32Array[i / 4] = view.getFloat32(i, true);  // true for little-endian
    }
    return float32Array;
  };

  const face2vec = (face: cv.Mat) => {
    const blob = cv.blobFromImage(face, 1.0, { width: 112, height: 112 }, [0, 0, 0, 0], true, false);
    netRecognRef.current!.setInput(blob);
    const vec = netRecognRef.current.forward();
    blob.delete();
    return vec;
  };

  const handleCompare = async () => {
    setCompareLoading(true);
    const uploadedCanvas = uploadedCanvasRef.current;
    const uploadedImage = cv.imread(uploadedCanvas!);

    const uploadedImageBGR = new cv.Mat();
    cv.cvtColor(uploadedImage, uploadedImageBGR, cv.COLOR_RGBA2BGR);

    var faces = detectFaces(uploadedImageBGR);

    if (faces.length > 0) {
      // Get the first face
      var face = uploadedImageBGR.roi(faces[0]);

      // Get face vector
      var uploadedVec = face2vec(face);
      console.log(uploadedVec);

      // Compare with current video frame
      var currentFaces = detectFaces(frameBGRRef.current);
      var bestMatchScore = 0;

      for (var i = 0; i < currentFaces.length; i++) {
        const rect = currentFaces[i];
        var currentFace = frameBGRRef.current.roi(rect);
        var currentVec = face2vec(currentFace);
        const uploadedU8 = float32ArrayToUint8Array(uploadedVec.data32F);
        const currentU8 = float32ArrayToUint8Array(currentVec.data32F);
        
        // Create a new Uint8Array to hold both vectors
        const combinedArray = new Uint8Array(uploadedU8.length + currentU8.length);
        
        // Copy uploaded vector first, then current vector
        combinedArray.set(uploadedU8, 0);
        combinedArray.set(currentU8, uploadedU8.length);
        
        console.log("Combined Uint8Array:", combinedArray);
        
        const fetchResult = await fetch('http://localhost:8080/run', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: Array.from(combinedArray) })
        });
        const result = await fetchResult.json();
        console.log("result:", result);
        const bytes = new Uint8Array(result.result);
        const score = uint8ArrayToFloat32Array(bytes);
        console.log("score:", score[0]);
        bestMatchScore = score[0];

        currentVec.delete();
      }

      // Show result
      var resultText =
        bestMatchScore > 30
          ? `Match found! (Score: ${bestMatchScore.toFixed(2)})`
          : `No match found (Score: ${bestMatchScore.toFixed(2)})`;
      setCompareResult(resultText);

      uploadedVec.delete();
      face.delete();
    } else {
      setCompareResult('No face detected in uploaded image');
    }

    uploadedImage.delete();
    uploadedImageBGR.delete();
    setCompareLoading(false);
  };

  const loadModels = async () => {
    const utils = new KycUtils('');
    const detectModel =
      'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx';
    const recognModel =
      'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx';

    try {
      setStatus('Downloading YuNet model...');
      await utils.createFileFromUrl('face_detection_yunet_2023mar.onnx', detectModel);

      setStatus('Downloading OpenFace model...');
      await utils.createFileFromUrl('face_recognition_sface_2021dec.onnx', recognModel);

      netDetRef.current = new (cv as any).FaceDetectorYN(
        'face_detection_yunet_2023mar.onnx',
        '',
        new cv.Size(320, 320),
        0.9,
        0.3,
        5000
      );

      netRecognRef.current = cv.readNet('face_recognition_sface_2021dec.onnx');
      setStatus('');
      setModelsLoaded(true);
    } catch (error) {
      setStatus('Model loading failed');
      console.error(error);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadModels();
    }
  }, []);

  return (
    <div className="container mx-auto p-4 mt-[80px]">
      <h1 className="text-2xl font-bold mb-4 text-center">ZK KYC</h1>
      <div>
        {modelsLoaded ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Face Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="photo-upload">Upload Face Image</Label>
                  <Input id="photo-upload" type="file" accept="image/*" onChange={handleFileUpload} className="mt-2" />
                  <canvas
                    ref={uploadedCanvasRef}
                    width="640" height="480"
                    className="mt-4 w-full border border-gray-200"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Capture Face Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={startCamera} className="mb-2">
                    <Camera className="mr-2 h-4 w-4" /> Open Camera
                  </Button>
                  <canvas ref={canvasRef} width="640" height="480" className='w-full' />
                </CardContent>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Face Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={handleCompare} loading={compareLoading} disabled={!uploadedImage || !isRunning}>
                  <Upload className="mr-2 h-4 w-4" /> Start Comparison
                </Button>
                {compareResult && (
                  <div className="mt-4">
                    <p>Matching Score: {compareResult}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm text-gray-500">{status || 'Loading models...'}</p>
          </div>
        )}
      </div>
      <video 
        ref={videoRef} 
        style={{ display: 'none' }}
      />
    </div>
  );
}
