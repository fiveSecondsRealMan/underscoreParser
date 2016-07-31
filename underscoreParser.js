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
    // 如果argCount为1，function (value) { func.call(context, value) }，常用于对数组的值的遍历
    // 如果argCount为2，function (value, other) { func.call(context, value, other) }
    // 如果argCount为3，function (value, index, collection) { func.call(context, value, index, collection) }，常用于对数组的值，索引的遍历
    // 如果argCount为4，function (accumulator, value, index, collection) { func.call(context, accumulator, value, index, collection) }，常用于数组的reduce
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

            case 3: return function (value, index, collection) {
                return func.call(context, value, index, collection);
            };

            case 4: return function (accumulator, value, index, collection) {
                return func.call(context, accumulator, value, index, collection);
            };
        }

        return function () {
            return func.apply(context, arguments);
        };
    };

    // 如果value为null、undefined，返回对数组值的遍历的函数
    // 如果value为Function类型，返回对value的优化函数
    // 如果value为Object类型，返回匹配value中的键值对的函数
    // 如果不满足以上几种情况，则返回一个获取对象以value作为key的值的函数
    var cb = function (value, context, argCount) {
        if (value == null)
            return _.identity;

        if (_.isFunction(value))
            return optimizeCb(value, context, argCount);

        if (_.isObject(value))
            return _.matcher(value);

        return _.property(value);
    };

    _.iteratee = function(value, context) {
        return cb(value, context, Infinity);
    };

    // 创建属性分配器函数
    var createAssigner = function (keysFunc, undefinedOnly) {
        return function(obj) {
            var length = arguments.length;

            if (length < 2 || obj == null)
                return obj;

            for (var index = 1; index < length; index++) {
                var source = arguments[index],
                    keys = keysFunc(source),
                    l = keys.length;
                for (var i = 0; i < l; i++) {
                    var key = keys[i];
                    if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
                }
            }

            return obj;
        };
    };

    // 创建一个继承prototype的新对象的函数
    // 如果浏览器环境、nodejs环境支持es5，则使用es5的Object.create方法
    // 理解js的prototype继承
    var baseCreate = function (prototype) {
        if (!_.isObject(prototype))
            return {};

        if (nativeCreate)
            return nativeCreate(prototype);

        // 将Ctor.prototype指向prototype
        Ctor.prototype = prototype;
        // 实例化Ctor时，根据js new操作符的定义，将产生通过原型继承的新对象result，因为js的原型继承基于原型链
        // 还需要理解js中的引用类型
        var result = new Ctor;
        Ctor.prototype = null;
        return result;
    };

    // 返回key在对象中对应的值
    var property = function(key) {
        return function(obj) {
            return obj == null ? void 0 : obj[key];
        };
    };

    // 获取整数最大值，其实一般用不到这么大，Math.pow(2, 16)，根据编程语言对整型的取值范围是-65535 ~ 65536
    var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;

    // 获取对象的length属性值
    var getLength = property('length');

    // 判断对象是否是类数组
    // 判断规则是对象的length属性值是否是number类型，值是否在0-MAX_ARRAY_INDEX之间
    // js中有4种类数组
    // 使用DOM Selector API生成的HTMLCollection
    // 使用DOM ClassList API生成的DOMTokenList
    // 方法调用时产生的arguments
    // 具有length属性和数字索引标识值的对象
    var isArrayLike = function (obj) {
        var length = getLength(obj);

        return typeof length === 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
    };

    // 对象、类数组对象、数组遍历
    // 首先生成适合于数组遍历的回调函数
    // 如果是数组或类数组对象，直接循环，得到值、数字索引键传给回调函数
    // 如果是对象，则先获取对象的key集合，循环集合，根据key集合中的值到对象中获取值
    _.each = _.forEach = function(obj, iteratee, context) {
        iteratee = optimizeCb(iteratee, context);
        var i, length;
        if (isArrayLike(obj)) {
            for (i = 0, length = obj.length; i < length; i++) {
                iteratee(obj[i], i, obj);
            }
        } else {
            var keys = _.keys(obj);
            for (i = 0, length = keys.length; i < length; i++) {
                iteratee(obj[keys[i]], keys[i], obj);
            }
        }

        return obj;
    };

    _.map = _.collect = function(obj, iteratee, context) {
        iteratee = cb(iteratee, context);
        var keys = !isArrayLike(obj) && _.keys(obj),
            length = (keys || obj).length,
            results = Array(length);
        for (var index = 0; index < length; index++) {
            var currentKey = keys ? keys[index] : index;
            results[index] = iteratee(obj[currentKey], currentKey, obj);
        }
        return results;
    };


    function createReduce (dir) {
        function iterator (obj, iteratee, memo, keys, index, length) {
            // 根据起始位置index进行遍历
            // 如果dir大于0，则从左到右，index依次增大进行遍历，需满足 index < length条件，正因为index依次增大，所以永远满足index >= 0
            // 如果dir小于0，则从右到左，index依次减小进行遍历，需满足 index >= 0条件，正因为index依次减小，所以永远满足index < length
            // 这里使用index >= 0 && index < length，写法比较巧妙，减少了冗余代码
            for (; index >= 0 && index < length; index += dir) {
                var currentKey = keys ? keys[index] : index;
                memo += iteratee(memo, obj[currentKey], currentKey, obj);
            }

            return memo;
        }

        return function (obj, iteratee, memo, context) {
            // 生成遍历对象或数组的回调函数
            iteratee = optimizeCb(iteratee, context, 4);

            // 如果是对象，得到对象的key集合，如果是数组则为false
            var keys = !isArrayLike(obj) && _.keys(obj),

            // 得到对象的key个数和数组的个数
                length = (keys || obj).length,

            // 根据dir得到起始位置
            // 如果dir为正，则遍历方向是从左到右，起始位置为0;
            // 如果dir为负，则遍历方向是从右到左，起始位置为length - 1;
                index = dir > 0 ? 0 : length - 1;

            if (arguments.length < 3) {
                memo = obj[keys ? keys[index] : index];
                index += dir;
            }

            return iterator(obj, iteratee, memo, keys, index, length);
        };
    }

    // 从左到右，起始位置依次增加
    _.reduce = _.foldl = _.inject = createReduce(1);
    // 从左到右，起始位置依次递减
    _.reduceRight = _.foldr = createReduce(-1);



})();