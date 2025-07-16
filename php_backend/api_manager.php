<?php
/**
 * API管理类
 * 用于统一处理API请求和响应
 */
class APIManager
{
    // HTTP状态码
    const HTTP_OK = 200;
    const HTTP_BAD_REQUEST = 400;
    const HTTP_UNAUTHORIZED = 401;
    const HTTP_FORBIDDEN = 403;
    const HTTP_NOT_FOUND = 404;
    const HTTP_METHOD_NOT_ALLOWED = 405;
    const HTTP_INTERNAL_SERVER_ERROR = 500;
    
    // API响应码
    const API_SUCCESS = 0;
    const API_ERROR = -1;
    const API_ERROR_SERVER = -99;
    const API_ERROR_DB = -2;
    const API_ERROR_AUTH = -3;
    const API_ERROR_PARAM = -4;
    
    private $requestId;
    private $startTime;
    private $requestData;
    private $requestMethod;
    private $requestPath;
    
    /**
     * 构造函数
     */
    public function __construct()
    {
        // 生成请求ID
        $this->requestId = uniqid('api_');
        $this->startTime = microtime(true);
        $this->requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN';
        $this->requestPath = $_SERVER['REQUEST_URI'] ?? 'UNKNOWN';
        
        // 设置错误处理
        $this->setupErrorHandling();
        
        // 设置响应头
        $this->setupResponseHeaders();
        
        // 记录请求信息
        $this->logRequestInfo();
    }
    
    /**
     * 设置错误处理
     */
    private function setupErrorHandling()
    {
        // 关闭PHP错误显示，避免HTML错误信息
        ini_set('display_errors', 0);
        ini_set('log_errors', 1);
        error_reporting(E_ALL);
        
        // 设置自定义错误处理函数
        set_error_handler(function($errno, $errstr, $errfile, $errline) {
            $this->logError("PHP错误: [$errno] $errstr in $errfile on line $errline");
            
            // 如果已经发送了内容，则不再发送错误信息
            if (headers_sent()) {
                return true;
            }
            
            $this->sendError('服务器内部错误', self::API_ERROR_SERVER, self::HTTP_INTERNAL_SERVER_ERROR, [
                'error' => $errstr,
                'file' => basename($errfile),
                'line' => $errline
            ]);
            
            exit;
        });
        
        // 设置自定义异常处理函数
        set_exception_handler(function($exception) {
            $this->logError("未捕获的异常: " . $exception->getMessage() . " in " . $exception->getFile() . " on line " . $exception->getLine());
            
            // 如果已经发送了内容，则不再发送错误信息
            if (headers_sent()) {
                return true;
            }
            
            $this->sendError('服务器异常', self::API_ERROR_SERVER, self::HTTP_INTERNAL_SERVER_ERROR, [
                'message' => $exception->getMessage(),
                'file' => basename($exception->getFile()),
                'line' => $exception->getLine()
            ]);
            
            exit;
        });
    }
    
    /**
     * 设置响应头
     */
    private function setupResponseHeaders()
    {
        // 设置响应头
        header('Content-Type: application/json; charset=UTF-8');
        
        // 允许跨域请求
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        
        // 如果是OPTIONS请求，直接返回200
        if ($this->requestMethod === 'OPTIONS') {
            http_response_code(self::HTTP_OK);
            exit;
        }
    }
    
    /**
     * 记录请求信息
     */
    private function logRequestInfo()
    {
        $this->log('====== API请求开始 ======');
        $this->log('请求ID: ' . $this->requestId);
        $this->log('请求时间: ' . date('Y-m-d H:i:s'));
        $this->log('请求IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
        $this->log('请求方法: ' . $this->requestMethod);
        $this->log('请求路径: ' . $this->requestPath);
        
        // 记录请求头信息
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $this->log('请求头: ' . print_r($headers, true));
        
        // 记录原始请求体
        $raw_post = file_get_contents('php://input');
        $this->log('原始请求体: ' . $raw_post);
        
        // 解析请求数据
        $this->parseRequestData();
    }
    
    /**
     * 解析请求数据
     */
    private function parseRequestData()
    {
        // 获取POST数据
        $post_data = file_get_contents('php://input');
        $this->requestData = json_decode($post_data, true);
        
        // 如果JSON解析失败，尝试使用$_POST
        if ($this->requestData === null && json_last_error() !== JSON_ERROR_NONE) {
            $this->requestData = $_POST;
        }
        
        // 如果是GET请求，使用$_GET
        if ($this->requestMethod === 'GET') {
            $this->requestData = $_GET;
        }
        
        $this->log('解析后的请求数据: ' . print_r($this->requestData, true));
    }
    
    /**
     * 获取请求参数
     * 
     * @param string $key 参数名
     * @param mixed $default 默认值
     * @return mixed 参数值
     */
    public function getParam($key, $default = null)
    {
        return isset($this->requestData[$key]) ? $this->requestData[$key] : $default;
    }
    
    /**
     * 检查必要参数
     * 
     * @param array $requiredParams 必要参数列表
     * @return bool 是否所有必要参数都存在
     */
    public function checkRequiredParams($requiredParams)
    {
        foreach ($requiredParams as $param) {
            if (!isset($this->requestData[$param])) {
                $this->sendError('缺少必要参数: ' . $param, self::API_ERROR_PARAM, self::HTTP_BAD_REQUEST);
                return false;
            }
        }
        return true;
    }
    
    /**
     * 发送成功响应
     * 
     * @param string $message 成功消息
     * @param mixed $data 响应数据
     */
    public function sendSuccess($message = '操作成功', $data = null)
    {
        $response = [
            'code' => self::API_SUCCESS,
            'msg' => $message,
        ];
        
        if ($data !== null) {
            $response['data'] = $data;
        }
        
        $this->sendResponse($response, self::HTTP_OK);
    }
    
    /**
     * 发送错误响应
     * 
     * @param string $message 错误消息
     * @param int $code 错误码
     * @param int $httpCode HTTP状态码
     * @param array $debug 调试信息
     */
    public function sendError($message = '操作失败', $code = self::API_ERROR, $httpCode = self::HTTP_BAD_REQUEST, $debug = null)
    {
        $response = [
            'code' => $code,
            'msg' => $message,
        ];
        
        if ($debug !== null && (defined('DEBUG_MODE') && DEBUG_MODE)) {
            $response['debug'] = $debug;
        }
        
        $this->sendResponse($response, $httpCode);
    }
    
    /**
     * 发送响应
     * 
     * @param array $data 响应数据
     * @param int $httpCode HTTP状态码
     */
    private function sendResponse($data, $httpCode = self::HTTP_OK)
    {
        // 设置HTTP状态码
        http_response_code($httpCode);
        
        // 计算请求处理时间
        $endTime = microtime(true);
        $duration = round(($endTime - $this->startTime) * 1000);
        
        // 添加请求ID和处理时间
        $data['request_id'] = $this->requestId;
        $data['duration'] = $duration . 'ms';
        
        // 输出JSON响应
        echo json_encode($data);
        
        // 记录响应信息
        $this->log('响应数据: ' . json_encode($data));
        $this->log('响应时间: ' . $duration . 'ms');
        $this->log('====== API请求结束 ======');
        
        exit;
    }
    
    /**
     * 记录日志
     * 
     * @param string $message 日志消息
     */
    public function log($message)
    {
        error_log("[{$this->requestId}] $message");
    }
    
    /**
     * 记录错误日志
     * 
     * @param string $message 错误消息
     */
    public function logError($message)
    {
        error_log("[{$this->requestId}] [ERROR] $message");
    }
    
    /**
     * 检查请求方法
     * 
     * @param string|array $allowedMethods 允许的请求方法
     * @return bool 是否是允许的请求方法
     */
    public function checkMethod($allowedMethods)
    {
        if (is_string($allowedMethods)) {
            $allowedMethods = [$allowedMethods];
        }
        
        if (!in_array($this->requestMethod, $allowedMethods)) {
            $this->sendError('请求方法不允许', self::API_ERROR, self::HTTP_METHOD_NOT_ALLOWED);
            return false;
        }
        
        return true;
    }
    
    /**
     * 获取请求数据
     * 
     * @return array 请求数据
     */
    public function getRequestData()
    {
        return $this->requestData;
    }
    
    /**
     * 获取请求方法
     * 
     * @return string 请求方法
     */
    public function getRequestMethod()
    {
        return $this->requestMethod;
    }
    
    /**
     * 获取请求路径
     * 
     * @return string 请求路径
     */
    public function getRequestPath()
    {
        return $this->requestPath;
    }
    
    /**
     * 获取请求ID
     * 
     * @return string 请求ID
     */
    public function getRequestId()
    {
        return $this->requestId;
    }
}
?> 