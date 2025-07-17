<?php
/**
 * 微信API管理类
 * 处理微信登录和解密数据
 */

require_once 'config.php';

class WechatManager {
    /**
     * 通过code获取openid和session_key
     * @param string $code 微信登录code
     * @return array|null 包含openid和session_key的数组，失败返回null
     */
    public static function codeToSession($code) {
        $url = "https://api.weixin.qq.com/sns/jscode2session";
        $params = [
            'appid' => WX_APPID,
            'secret' => WX_SECRET,
            'js_code' => $code,
            'grant_type' => 'authorization_code'
        ];
        
        $result = self::httpGet($url, $params);
        $data = json_decode($result, true);
        
        if (isset($data['errcode']) && $data['errcode'] != 0) {
            error_log("微信登录失败: " . json_encode($data));
            return null;
        }
        
        return [
            'openid' => $data['openid'],
            'session_key' => $data['session_key']
        ];
    }
    
    /**
     * 解密微信加密数据
     * @param string $encryptedData 加密数据
     * @param string $iv 加密算法的初始向量
     * @param string $sessionKey 会话密钥
     * @return array|null 解密后的数据，失败返回null
     */
    public static function decryptData($encryptedData, $iv, $sessionKey) {
        if (strlen($sessionKey) != 24) {
            return null;
        }
        $aesKey = base64_decode($sessionKey);
        
        if (strlen($iv) != 24) {
            return null;
        }
        $aesIV = base64_decode($iv);
        
        $aesCipher = base64_decode($encryptedData);
        $result = openssl_decrypt($aesCipher, "AES-128-CBC", $aesKey, 1, $aesIV);
        
        $dataObj = json_decode($result, true);
        if ($dataObj === null) {
            return null;
        }
        
        if (isset($dataObj['watermark']['appid']) && $dataObj['watermark']['appid'] != WX_APPID) {
            return null;
        }
        
        return $dataObj;
    }
    
    /**
     * 发送HTTP GET请求
     * @param string $url 请求URL
     * @param array $params 请求参数
     * @return string 响应内容
     */
    private static function httpGet($url, $params = []) {
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        $result = curl_exec($ch);
        curl_close($ch);
        
        return $result;
    }
} 