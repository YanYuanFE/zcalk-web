import cv from '@techstark/opencv-js';

interface VideoConstraints {
  width: { exact: number };
  height: { exact: number };
}

interface Constraints {
  qvga: VideoConstraints;
  vga: VideoConstraints;
}

export class KycUtils {
  //   private errorOutput: HTMLElement;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private onCameraStartedCallback?: (stream: MediaStream, video: HTMLVideoElement) => void;
  private readonly OPENCV_URL: string = 'opencv.js';

  constructor(errorOutputId: string) {
    // const element = document.getElementById(errorOutputId);
    // if (!element) {
    //   throw new Error(`Element with id ${errorOutputId} not found`);
    // }
    // this.errorOutput = element;
  }

  //   loadOpenCv(onloadCallback: () => void): void {
  //     let script = document.createElement('script');
  //     script.setAttribute('async', '');
  //     script.setAttribute('type', 'text/javascript');
  //     script.addEventListener('load', async () => {
  //       if (cv.getBuildInformation) {
  //         console.log(cv.getBuildInformation());
  //         onloadCallback();
  //       } else {
  //         // WASM
  //         if (cv instanceof Promise) {
  //           cv = await cv;
  //           console.log(cv.getBuildInformation());
  //           onloadCallback();
  //         } else {
  //           cv['onRuntimeInitialized'] = () => {
  //             console.log(cv.getBuildInformation());
  //             onloadCallback();
  //           };
  //         }
  //       }
  //     });
  //     script.addEventListener('error', () => {
  //       this.printError('Failed to load ' + this.OPENCV_URL);
  //     });
  //     script.src = this.OPENCV_URL;
  //     let node = document.getElementsByTagName('script')[0];
  //     if (node && node.parentNode) {
  //       node.parentNode.insertBefore(script, node);
  //     }
  //   }

  async createFileFromUrl(path: string, url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load ${url} status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      cv.FS_createDataFile('/', path, data, true, false, false);
    } catch (error) {
      this.printError(error);
      throw error;
    }
  }

  loadImageToCanvas(url: string, canvasId: string): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas with id ${canvasId} not found`);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2d context');
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function (): void {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
    };
    img.src = url;
  }

  executeCode(textAreaId: string): void {
    try {
      this.clearError();
      let code = (document.getElementById(textAreaId) as HTMLTextAreaElement)?.value;
      eval(code);
    } catch (err) {
      this.printError(err);
    }
  }

  clearError(): void {
    // this.errorOutput.innerHTML = '';
  }

  printError(err: any): void {
    if (typeof err === 'undefined') {
      err = '';
    } else if (typeof err === 'number') {
      if (!isNaN(err)) {
        if (typeof cv !== 'undefined') {
          err = 'Exception: ' + cv.exceptionFromPtr(err).msg;
        }
      }
    } else if (typeof err === 'string') {
      let ptr = Number(err.split(' ')[0]);
      if (!isNaN(ptr)) {
        if (typeof cv !== 'undefined') {
          err = 'Exception: ' + cv.exceptionFromPtr(ptr).msg;
        }
      }
    } else if (err instanceof Error) {
      err = err.stack?.replace(/\n/g, '<br>') || '';
    }
    // this.errorOutput.innerHTML = err;
  }

  loadCode(scriptId: string, textAreaId: string): void {
    // let scriptNode = document.getElementById(scriptId);
    // let textArea = document.getElementById(textAreaId);
    // if (scriptNode && scriptNode.type !== 'text/code-snippet') {
    //   throw Error('Unknown code snippet type');
    // }
    // if (textArea && scriptNode) {
    //   textArea.value = scriptNode.text.replace(/^\n/, '');
    // }
  }

  addFileInputHandler(fileInputId: string, canvasId: string): void {
    let inputElement = document.getElementById(fileInputId);
    inputElement!.addEventListener(
      'change',
      (e) => {
        let files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          let imgUrl = URL.createObjectURL(files[0]);
          this.loadImageToCanvas(imgUrl, canvasId);
        }
      },
      false
    );
  }

  startCamera(
    resolution: keyof Constraints | string,
    callback: (stream: MediaStream, video: HTMLVideoElement) => void,
    videoId: string
  ): void {
    const constraints: Constraints = {
      qvga: { width: { exact: 320 }, height: { exact: 240 } },
      vga: { width: { exact: 640 }, height: { exact: 480 } }
    };

    let video = document.getElementById(videoId) as HTMLVideoElement;
    if (!video) {
      video = document.createElement('video');
    }

    const videoConstraint = constraints[resolution as keyof Constraints] || true;

    navigator.mediaDevices
      .getUserMedia({ video: videoConstraint, audio: false })
      .then((stream: MediaStream) => {
        video.srcObject = stream;
        video.play();
        this.video = video;
        this.stream = stream;
        this.onCameraStartedCallback = callback;
        video.addEventListener('canplay', this.onVideoCanPlay.bind(this), false);
      })
      .catch((err: Error) => {
        this.printError(`Camera Error: ${err.name} ${err.message}`);
      });
  }

  private onVideoCanPlay(): void {
    if (this.onCameraStartedCallback && this.stream && this.video) {
      this.onCameraStartedCallback(this.stream, this.video);
    }
  }

  stopCamera(): void {
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
      this.video.removeEventListener('canplay', this.onVideoCanPlay.bind(this));
    }
    if (this.stream) {
      this.stream.getVideoTracks()[0].stop();
    }
  }
}
