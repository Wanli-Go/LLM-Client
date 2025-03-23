import { throttle } from "radashi";

let previousDistance = 262143;

export const animation = throttle({interval: 200}, (obj, target, fn1) => {
    // console.log(fn1);
    // fn是一个回调函数，在定时器结束的时候添加
    // 每次开定时器之前先清除掉定时器
    previousDistance = 262143;
    clearInterval(obj.timer);
    obj.timer = setInterval(function () {
      let distance = target - obj.scrollTop
      // 步长计算公式  越来越小
      let step = (distance) / 10;
      // 步长取整
      step = Math.ceil(step);
      if (obj.scrollTop >= target - 1 || distance > previousDistance ) {
        if(distance > previousDistance) document.dispatchEvent(new CustomEvent('scrolledUp'));
        clearInterval(obj.timer);
        // 如果fn1存在，调用fn
        if (fn1) {
          fn1();
        }
      } else {
        // 每30毫秒就将新的值给obj.left
        obj.scrollTop = obj.scrollTop + step;
        previousDistance = distance;
      }
    }, 10);
  })