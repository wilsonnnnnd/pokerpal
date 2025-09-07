import { deviceKey } from "@/constants/namingDb"
import AsyncStorage from "@react-native-async-storage/async-storage"

export async function getDeviceId(): Promise<string> {
    // 先看缓存
    try {
        const saved = await AsyncStorage.getItem(deviceKey)
        if (saved) {
            return saved
        }
    } catch (e) {
        console.warn('[getDeviceId] AsyncStorage.getItem failed:', e)
    }

    try {
        // 动态 require 避免 web 端报错
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const DeviceInfo = require("react-native-device-info")

        if (DeviceInfo?.getUniqueId) {
            const id: string = await DeviceInfo.getUniqueId()
            if (id) {
                try {
                    await AsyncStorage.setItem(deviceKey, id)
                } catch (e) {
                    console.warn('[getDeviceId] AsyncStorage.setItem failed:', e)
                }
                return id
            }
        } else {
            console.warn('[getDeviceId] getUniqueId not available on DeviceInfo')
        }
    } catch (err) {
        console.warn('[getDeviceId] require(DeviceInfo) failed:', err)
    }

    // fallback：随机 ID（卸载重装会变）
    const fallbackId = `host-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    try {
        await AsyncStorage.setItem(deviceKey, fallbackId)
    } catch (e) {
        console.warn('[getDeviceId] AsyncStorage.setItem fallback failed:', e)
    }
    return fallbackId
}
