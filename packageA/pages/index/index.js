import {createScopedThreejs} from 'threejs-miniprogram';
const facemesh = require('@tensorflow-models/facemesh')
var fetchWechat = require('fetch-wechat');
var tf = require('@tensorflow/tfjs-core');
var webgl = require('@tensorflow/tfjs-backend-webgl');
var plugin = requirePlugin('tfjsPlugin');
// import * as THREE from '../../utils/three.min.js';
import {registerGLTFLoader} from '../../utils/gltf-loader';

var flag = true
// var canvas
// var ctx
var uplip=[61,185,40,39,37,0,267,269,270,409,291,306,292,308,415,310,311,312,13,82,81,80,191,78,62,76]
var downlip=[61,76,62,78,95,88,178,87,14,317,402,318,324,308,292,306,291,375,321,405,314,17,84,181,91,146]
var app = getApp();
//优化three改成全局变量
var THREE;
var ambient;
var camera, scene, renderer;
var material;
var glasses, loader, cubeTextureLoader, cubeTexture;
//----------------------------------------------

Page({
  onLoad: function () {
    var _this=this
    //----------------------------------

  },

  onReady: function () {
    var _this = this
    var offcanvas=wx.createOffscreenCanvas()
    plugin.configPlugin({
      // polyfill fetch function
      fetchFunc: fetchWechat.fetchFunc(),
      // inject tfjs runtime
      tf,
      // inject webgl backend
      webgl,
      // provide webgl canvas
      canvas: offcanvas
    });
    wx.onMemoryWarning(function () {
      wx.showLoading('onMemoryWarningReceive')
    })
//----------------------------------
    var query = wx.createSelectorQuery();

    query.select('#c')
      .node()
      .exec(async (res) => {
        var webcanvas = res[0].node;
        THREE = createScopedThreejs(webcanvas);
        console.log('THREE', THREE);
        registerGLTFLoader(THREE);
        ambient = new THREE.AmbientLight(0xF5F0F0);
        material = new THREE.MeshPhongMaterial({
          color: 0x920808,
          side: THREE.BackSide,
          opacity: 0.6,
          transparent: true
        });
       // var k = 288 / 352;
        var k = 480 / 640;
        //var s = 176; //三维场景显示范围控制系数、
        var s = 320
        camera = new THREE.OrthographicCamera(-s * k, s * k, s, -s, 1, 155);
        var x = 240
        var y = -320
        //使camera正对中心
        camera.position.set(x, y, 150);
        camera.lookAt(x, y, 0);

        renderer = new THREE.WebGLRenderer({
          // canvas: webcanvas,
          antialias: true,//反锯齿
          alpha: true//透明
        });
        renderer.setPixelRatio(wx.getSystemInfoSync().pixelRatio);

        cubeTextureLoader = new THREE.CubeTextureLoader();
        //六张图片分别是朝前的（posz）、朝后的（negz）、朝上的（posy）、朝下的（negy）、朝右的（posx）和朝左的（negx）。
        cubeTexture = cubeTextureLoader.load([
        ]);
        loader = new THREE.GLTFLoader();
        scene = new THREE.Scene();
        await loader.load("https://www.wechatvr.org/weights/weights/glasses/glasses007.gltf", function (gltf) {
          // gltf.scene.traverse(function (child) {
          //   if (child.isMesh) {
          //     child.material.envMap = cubeTexture;
          //   }
          // });
          // scene.add(gltf.scene);
          // glasses = scene.children[0];
          // glasses.position.set(200,-100,0);
          // renderer.render(scene, camera);
          // scene.remove(gltf.scene);
          glasses = gltf.scene;
          
        });

        wx.showLoading({ title: 'loading', });

        plugin.configPlugin({
          // polyfill fetch function
          fetchFunc: fetchWechat.fetchFunc(),
          // inject tfjs runtime
          tf,
          // inject webgl backend
          webgl,
          // provide webgl canvas
          canvas: wx.createOffscreenCanvas()
        });       
        _this.model = facemesh.load({
          maxFaces:1,
          maxContinuousChecks: 1
        }) 
        _this.model.then(model => { this.main(model) })
      })
  },

  start() {
    var _this = this
    _this.listener.start()
  },

  sleep(ms){
    var _this = this
    return new Promise(resolve => setTimeout(resolve, ms))
  },


  async main(model) {
    var _this = this;

    const context = wx.createCameraContext()

    var preds =  await model.estimateFaces(tf.zeros([192,192,3]))
    wx.hideLoading()

    // wx.getSystemInfo({
    //   success (res) {
    //     console.log(res.model)
    //     console.log(res.pixelRatio)
    //     console.log(res.windowWidth)
    //     console.log(res.windowHeight)
    //     console.log(res.language)
    //     console.log(res.version)
    //     console.log(res.platform)
    //     renderer.setPixelRatio(res.pixelRatio)
    //   }
    // })
    // scene = new THREE.Scene();

    //提高亮度
    // const light = new THREE.DirectionalLight('#ffffff',3)
    // light.position.set(144,-176,20)//光方向
    // scene.add(light);
    scene.add(ambient);

    _this.listener = context.onCameraFrame(async (res) => {

      if (!flag) {
        return //说明前面还没画完
      }

      flag = false
      let temp=res.data.slice()

      let frame={
        data: new Uint8Array(temp),
        width: res.width,
        height: res.height,
      }

      let geometry = new THREE.PlaneGeometry(480,640); //矩形平面
      let texture = new THREE.DataTexture(frame.data,480, 640, THREE.RGBAFormat);

      texture.needsUpdate = true; //纹理更新，作用存疑，似乎是正作用
      let tex_material = new THREE.MeshPhongMaterial({
        map: texture, // 设置纹理贴图
        side: THREE.DoubleSide
      });
      geometry.translate(240, 320, 0);
      geometry.rotateX(Math.PI)
      let mesh = new THREE.Mesh(geometry, tex_material);
      const t33=new Date()
      const preds = await model.estimateFaces(frame)
      const t44=new Date()
      console.log(t44-t33)
        if (preds.length < 1) {
          flag = true;

          scene.add(mesh)
          renderer.render(scene, camera);
          scene.remove(mesh)  

          geometry.dispose();
          tex_material.dispose();
          texture.dispose();
          return
        }

        let lowerlip = [];
        let upperlip = [];
        for(let i=0;i<downlip.length;i++)
        {
          lowerlip.push(new THREE.Vector3(
            preds[0].scaledMesh[downlip[i]][0],
            preds[0].scaledMesh[downlip[i]][1]+2,0));
        }
    
        for(let i=0;i<uplip.length;i++)
        {
          upperlip.push(new THREE.Vector3(
            preds[0].scaledMesh[uplip[i]][0],
            preds[0].scaledMesh[uplip[i]][1]+1,0));
        }
        // var SplineCurve1 = new THREE.SplineCurve(points1)
        // var shape1 = new THREE.Shape(SplineCurve1.getPoints(300));
        // var SplineCurve2 = new THREE.SplineCurve(points2)
        // var shape2 = new THREE.Shape(SplineCurve2.getPoints(300));

        let geometry1 = new THREE.ShapeGeometry(new THREE.Shape(lowerlip));
        geometry1.rotateX(Math.PI)
        let geometry2 = new THREE.ShapeGeometry(new THREE.Shape(upperlip));
        geometry2.rotateX(Math.PI)
        let up_lip = new THREE.Mesh(geometry1, material)
        let low_lip = new THREE.Mesh(geometry2, material)

       

        // 眼镜穿戴
        
        let keypoints = preds[0].scaledMesh;//预测出的468个点
        let pos1 = new THREE.Vector3(...keypoints[234]);//234
        let pos2 = new THREE.Vector3(...keypoints[454]);//454
        let distance = pos1.distanceTo(pos2);//太阳穴直线距离
        // let s = distance / 246.83775584905263*0.8;//眼镜缩放比例
        let s = distance / 150.83775584905263*0.8;//眼镜缩放比例
        //眼镜放置
        glasses.position.x= keypoints[6][0];
        glasses.position.y= -keypoints[6][1];
        glasses.position.z= -keypoints[6][2] + 30;
        console.log(glasses.position);
        glasses.scale.set(s ,s ,s);
        // glasses.traverse( function ( child ) {
        //   if ( child.isMesh ) {
        //     child.material.envMap = cubeTexture;
        //     child.material.envMapIntensity = 0.6;
        //   }
        // } );
        //姿态估计 两个向量之间的旋转矩阵
        let v1 = new THREE.Vector3(-1, 0, 0);
        v1.normalize();
        let v2 = new THREE.Vector3((keypoints[33][0] - keypoints[263][0]), -(keypoints[33][1] -keypoints[263][1]), (keypoints[33][2] -keypoints[263][2]));
        // let v2 = new THREE.Vector3(keypoints[234][0] - keypoints[454][0],keypoints[234][1] -keypoints[454][1], keypoints[234][2] -keypoints[454][2]);
        v2.normalize();
        let quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors( v1, v2 );
        glasses.setRotationFromQuaternion(quaternion);
        // glasses.rotateX(Math.PI);
        // glasses.rotateY(Math.PI);
        // glasses.rotateZ(Math.PI);
        // ------------------------------------------
        // scene.add(glasses);
        console.log('glass', glasses);
        scene.add(mesh)
        scene.add(up_lip)
        scene.add(low_lip)
        scene.add(glasses);
        renderer.render(scene, camera);
        scene.remove(mesh,low_lip,up_lip, glasses);

        geometry.dispose();
        tex_material.dispose();
        texture.dispose();
        geometry1.dispose()
        geometry2.dispose()//dispose放在前面还是可以正常访问?  设成null?
        var a=await this.sleep(0)
        flag=true
      })

    
  },

  data: {

  },
})
