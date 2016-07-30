// 使用定义既执行函数避免污染全局变量，运用闭包，将内部变量导出
(function () {
    // 保存全局对象，在浏览器环境下引用window、node环境引用exports
    var root = this;

    // 保存全局环境中的'_'变量
    var previousUnderscore = root._;

    // 缓存数组、对象、函数原型对象，目的是减少代码量和原型链遍历
    var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

    // 缓存数组、对象、函数常用的方法
    var
        push             = ArrayProto.push,
        slice            = ArrayProto.slice,
        toString         = ObjProto.toString,
        hasOwnProperty   = ObjProto.hasOwnProperty;

    var
        nativeIsArray      = Array.isArray,
        nativeKeys         = Object.keys,
        nativeBind         = FuncProto.bind,
        nativeCreate       = Object.create;

    // 子类构造器
    var Ctor = function(){};

    // underscore构造器
    // 如果obj是_的实例，则返回obj
    // 如果_通过普通调用或者call、apply的上下文参数不是_的实例，重新实例化
    var _ = function (obj) {
        if (obj instanceof _) return obj;

        if (!(this instanceof _)) return new _(obj);

        this._wrapped = obj;
    };

    // 支持模块化导出
    // node.js环境下使用module.exports = exports = _导出underscore
    // 如果是amd环境，使用exports._ = _
    // 如果是浏览器环境，使用root._ = _;
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports)
            exports = module.exports = _;
        exports._ = _;
    } else {
        root._ = _;
    }

    // 当前版本
    _.VERSION = '1.8.3';

    // 优化回调函数，
    // 根据argCount返回适合各种业务带有详细参数的函数并且内部改变func的上下文的调用
    // 如果argCount为1，function (value) { func.call(context, value) }，常用于对数组的遍历
    // 考察的是apply、call、void 0
    var optimizeCb = function (func, context, argCount) {
        if (context === void 0)
            return func;

        switch (argCount == null ? 3 : argCount) {
            case 1: return function (value) {
                return func.call(context, value);
            };

            case 2: return function (value, other) {
                return func.call(context, value, other);
            };

            

        }


    };

})();