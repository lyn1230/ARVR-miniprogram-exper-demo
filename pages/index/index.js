const app = getApp()

Page({
  data: {
    shareConfig: {},
    showAR: false
  },
  onLoad: function () {
    let _this = this;
    wx.request({
      url: 'https://weixin.wechatvr.org/services/frontend/rs/activity/scan/config/info?activityId=239', //仅为示例，并非真实的接口地址
      data: null,
      header: {
        'content-type': 'application/json' // 默认值
      },
      success (res) {
        let shareConfig = {
          shareUrl: res.data.shareUrl,
          sharedDescription: res.data.sharedDescription,
          sharedPicUrl: res.data.sharedPicUrl,
          sharedTitle: res.data.sharedTitle,
      } ;
        _this.setData({
          shareConfig: shareConfig
        }); 
      }
    })
  },
  jumpToVR: function(){  
    wx.navigateTo({
      url: '/pages/renDaVR/renDaVR'
    })
  },
  showARList: function(){
    let that = this;
    this.setData({
      showAR: !that.data.showAR
    });
  },
  jumpToLip: function() {
    wx.navigateTo({
      url: '/packageA/pages/index/index'
    })
  },
  onShareAppMessage: function() {    //分享标题、分享描述、分享路径（可带参数）  
    return {     
      title: this.data.shareConfig.sharedTitle,     
      desc: this.data.shareConfig.sharedDescription,
      path: '/pages/index/index',
      imageUrl: this.data.shareConfig.sharedPicUrl     
    }     
  }
})
