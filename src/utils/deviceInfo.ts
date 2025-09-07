import { deviceKey } from "@/constants/namingDb"
import AsyncStorage from "@react-native-async-storage/async-storage"



export async function getDeviceId(): Promise<string> {
    // 先看缓存
    const saved = await AsyncStorage.getItem(deviceKey)
    if (saved) return saved

    try {
        // 动态 require 避免 web 端报错
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const DeviceInfo = require("react-native-device-info")

        if (DeviceInfo?.getUniqueId) {
            const id: string = await DeviceInfo.getUniqueId()
            if (id) {
                await AsyncStorage.setItem(deviceKey, id)
                return id
            }
        }
    } catch {
        // ignore
    }

    // fallback：随机 ID（卸载重装会变）
    const fallbackId = `host-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    await AsyncStorage.setItem(deviceKey, fallbackId)
    return fallbackId
}
