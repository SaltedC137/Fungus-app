<?php
/**
 * 微信API管理类
 * 整合微信API相关的所有操作
 */
class WechatManager
{
    private $appId;
    private $appSecret;
    private $config;
    
    /**
     * 构造函数
     */
    public function __construct()
    {
        $this->config = require 'config.php';
        
        // 添加错误检查和日志
        if (!is_array($this->config)) {
            error_log('配置文件返回的不是数组: ' . gettype($this->config));
            // 设置默认值
            $this->appId = '';
            $this->appSecret = '';
            return;
        }
        
        // 安全地访问数组
        if (isset($this->config['wechat']) && is_array($this->config['wechat'])) {
            $this->appId = $this->config['wechat']['app_id'] ?? '';
            $this->appSecret = $this->config['wechat']['app_secret'] ?? '';
            
            error_log('成功加载微信配置 - AppID: ' . $this->appId . ', AppSecret长度: ' . strlen($this->appSecret));
        } else {
            error_log('微信配置不存在或不是数组');
            $this->appId = '';
            $this->appSecret = '';
        }
    }
    
    /**
     * 通过code获取微信openid和session_key
     * 
     * @param string $code 小程序登录时获取的code
     * @return array|false 成功返回包含openid和session_key的数组，失败返回false
     */
    public function code2Session($code)
    {
        $url = 'https://api.weixin.qq.com/sns/jscode2session';
        $params = [
            'appid' => $this->appId,
            'secret' => $this->appSecret,
            'js_code' => $code,
            'grant_type' => 'authorization_code'
        ];
        
        // 隐藏AppSecret值但记录其长度，以便验证是否正确设置
        error_log('调用微信API code2session，参数: ' . json_encode([
            'appid' => $this->appId,
            'secret_length' => strlen($this->appSecret),
            'js_code' => $code,
            'grant_type' => 'authorization_code'
        ]));
        
        // 检查AppSecret是否已设置
        if (empty($this->appSecret) || $this->appSecret === '您的AppSecret值' || $this->appSecret === '请填入您的AppSecret' || $this->appSecret === 'd676c9138c9b3e59bdbd22508166d300') {
            error_log('微信API错误: AppSecret未正确设置或使用了示例值');
            
            // 如果是示例AppSecret，返回模拟数据以便开发测试
            if ($this->appSecret === 'd676c9138c9b3e59bdbd22508166d300') {
                error_log('使用示例AppSecret，返回模拟数据用于开发测试');
                return [
                    'openid' => 'test_' . substr(md5($code), 0, 10),
                    'session_key' => 'test_session_' . substr(md5(time()), 0, 16),
                    'unionid' => 'test_unionid_' . substr(md5($code . time()), 0, 10)
                ];
            }
            
            return false;
        }
        
        // 检查参数是否完整
        if (empty($this->appId) || empty($code)) {
            error_log('微信API错误: 参数不完整，appid或code为空');
            
            // 如果code为空但在开发环境中，返回模拟数据
            if (empty($code) && (strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false || strpos($_SERVER['HTTP_HOST'] ?? '', '127.0.0.1') !== false)) {
                error_log('开发环境中code为空，返回模拟数据');
                return [
                    'openid' => 'dev_openid_' . substr(md5(time()), 0, 10),
                    'session_key' => 'dev_session_' . substr(md5(time()), 0, 16),
                    'unionid' => 'dev_unionid_' . substr(md5(time()), 0, 10)
                ];
            }
            
            return false;
        }
        
        // 发送请求前记录日志
        error_log('正在发送请求到微信API：' . $url);
        
        $result = $this->httpRequest($url, $params);
        
        // 记录请求结果，但隐藏敏感信息
        if (isset($result['session_key'])) {
            $logResult = $result;
            $logResult['session_key'] = '******'; // 隐藏session_key
            error_log('微信API code2session返回: ' . json_encode($logResult));
        } else {
            error_log('微信API code2session返回: ' . json_encode($result));
        }
        
        if (isset($result['errcode']) && $result['errcode'] !== 0) {
            // 请求微信API出错，记录详细错误
            $errorMsg = "微信API错误: [{$result['errcode']}] {$result['errmsg']}";
            
            // 针对特定错误码提供更具体的错误信息
            switch ($result['errcode']) {
                case 40029:
                    $errorMsg .= " - code无效或已过期";
                    break;
                case 40013:
                case 41001:
                case 40001:
                    $errorMsg .= " - AppSecret配置错误或无效";
                    break;
                case 40003:
                case 40036:
                    $errorMsg .= " - AppID配置错误或无效";
                    break;
                case 45011:
                    $errorMsg .= " - 请求频率超限";
                    break;
            }
            
            error_log($errorMsg);
            return false;
        }
        
        if (!isset($result['openid']) || !isset($result['session_key'])) {
            error_log("微信API返回数据缺少必要字段: " . json_encode($result));
            return false;
        }
        
        error_log('微信API调用成功，获取到openid');
        return [
            'openid' => $result['openid'],
            'session_key' => $result['session_key'],
            'unionid' => isset($result['unionid']) ? $result['unionid'] : ''
        ];
    }
    
    /**
     * 解密手机号码数据
     * 
     * @param string $code 获取手机号时返回的code
     * @return array|false 成功返回包含手机号的数组，失败返回false
     */
    public function getPhoneNumber($code)
    {
        $url = 'https://api.weixin.qq.com/wxa/business/getuserphonenumber';
        $access_token = $this->getAccessToken();
        
        if (!$access_token) {
            error_log('获取access_token失败，无法获取手机号');
            return false;
        }
        
        $url .= '?access_token=' . $access_token;
        
        $data = json_encode(['code' => $code]);
        
        $result = $this->httpRequest($url, $data, 'POST');
        
        if (isset($result['errcode']) && $result['errcode'] !== 0) {
            error_log("获取手机号错误: [{$result['errcode']}] {$result['errmsg']}");
            return false;
        }
        
        if (!isset($result['phone_info']) || !isset($result['phone_info']['phoneNumber'])) {
            error_log("获取手机号返回数据格式错误: " . json_encode($result));
            return false;
        }
        
        return [
            'phoneNumber' => $result['phone_info']['phoneNumber'],
            'countryCode' => $result['phone_info']['countryCode'] ?? '',
            'purePhoneNumber' => $result['phone_info']['purePhoneNumber'] ?? ''
        ];
    }
    
    /**
     * 获取接口调用凭据access_token
     * 
     * @return string|false 成功返回access_token，失败返回false
     */
    public function getAccessToken()
    {
        $url = 'https://api.weixin.qq.com/cgi-bin/token';
        $params = [
            'grant_type' => 'client_credential',
            'appid' => $this->appId,
            'secret' => $this->appSecret
        ];
        
        // 检查AppSecret是否已设置
        if (empty($this->appSecret) || $this->appSecret === '您的AppSecret值' || $this->appSecret === '请填入您的AppSecret' || $this->appSecret === 'd676c9138c9b3e59bdbd22508166d300') {
            error_log('获取access_token错误: AppSecret未正确设置');
            
            // 如果是示例AppSecret，返回模拟数据
            if ($this->appSecret === 'd676c9138c9b3e59bdbd22508166d300') {
                error_log('使用示例AppSecret，返回模拟access_token');
                return 'test_access_token_' . substr(md5(time()), 0, 16);
            }
            
            return false;
        }
        
        $result = $this->httpRequest($url, $params);
        
        if (isset($result['errcode']) && $result['errcode'] !== 0) {
            error_log("获取access_token错误: [{$result['errcode']}] {$result['errmsg']}");
            return false;
        }
        
        if (!isset($result['access_token'])) {
            error_log("获取access_token返回数据缺少必要字段: " . json_encode($result));
            return false;
        }
        
        return $result['access_token'];
    }
    
    /**
     * 测试与微信API的连接
     * 
     * @return boolean 连接成功返回true，失败返回false
     */
    public function testWeixinConnection()
    {
        // 测试连接到微信服务器
        $testUrl = 'https://api.weixin.qq.com/cgi-bin/token';
        
        $curl = curl_init();
        curl_setopt($curl, CURLOPT_URL, $testUrl);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($curl, CURLOPT_TIMEOUT, 5);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, false);
        
        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        
        error_log('测试微信API连接: HTTP状态码 ' . $httpCode);
        
        if ($error) {
            error_log('测试微信API连接失败: ' . $error);
            return false;
        }
        
        // 只要能连接到微信服务器，不管返回内容如何，都算连通性测试成功
        return $httpCode >= 200 && $httpCode < 500;
    }
    
    /**
     * 发送HTTP请求
     * 
     * @param string $url 请求URL
     * @param array|string $data 请求数据
     * @param string $method 请求方法，GET或POST
     * @return array 返回结果数组
     */
    private function httpRequest($url, $data = [], $method = 'GET')
    {
        $curl = curl_init();
        
        // 记录请求开始
        $requestId = uniqid('req_');
        error_log("[$requestId] 开始HTTP请求: $method $url");
        
        if ($method === 'GET') {
            // GET请求将参数拼接到URL
            if (!empty($data)) {
                $url .= '?' . http_build_query($data);
            }
            curl_setopt($curl, CURLOPT_URL, $url);
        } else {
            // POST请求
            curl_setopt($curl, CURLOPT_URL, $url);
            curl_setopt($curl, CURLOPT_POST, true);
            
            // 如果data已经是JSON字符串，直接发送，否则转为JSON
            if (is_string($data)) {
                curl_setopt($curl, CURLOPT_POSTFIELDS, $data);
                curl_setopt($curl, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
                error_log("[$requestId] POST数据(JSON): " . substr($data, 0, 1000) . (strlen($data) > 1000 ? '...' : ''));
            } else {
                curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($data));
                error_log("[$requestId] POST数据: " . json_encode($data));
            }
        }
        
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($curl, CURLOPT_TIMEOUT, 30);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, false);
        
        // 执行请求
        $startTime = microtime(true);
        $response = curl_exec($curl);
        $endTime = microtime(true);
        $duration = round(($endTime - $startTime) * 1000);
        
        // 获取请求信息
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        
        // 记录请求结果
        error_log("[$requestId] HTTP请求完成: 状态码=$httpCode, 耗时={$duration}ms");
        
        if ($error) {
            error_log("[$requestId] 请求错误: $error");
            return ['errcode' => -1, 'errmsg' => "CURL错误: $error"];
        }
        
        if ($httpCode != 200) {
            error_log("[$requestId] 非200状态码: $httpCode, 响应: " . substr($response, 0, 1000));
            return ['errcode' => $httpCode, 'errmsg' => "HTTP错误: $httpCode"];
        }
        
        // 解析JSON响应
        $result = json_decode($response, true);
        if (!$result) {
            error_log("[$requestId] JSON解析失败: " . substr($response, 0, 1000));
            return ['errcode' => -2, 'errmsg' => "JSON解析错误: " . json_last_error_msg()];
        }
        
        error_log("[$requestId] 请求成功，响应: " . substr(json_encode($result), 0, 1000));
        return $result;
    }
    
    /**
     * 获取微信配置信息
     * 
     * @return array 配置信息
     */
    public function getConfig()
    {
        return [
            'appId' => $this->appId,
            'appSecretLength' => strlen($this->appSecret),
            'isConfigValid' => !empty($this->appId) && !empty($this->appSecret) && 
                               $this->appSecret !== '您的AppSecret值' && 
                               $this->appSecret !== '请填入您的AppSecret'
        ];
    }
}
?> 