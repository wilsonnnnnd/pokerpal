import { userByEmailDoc } from "@/constants/namingVar";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./config";

export const fetchUsersByEmail = async () => {
    const querySnapshot = await getDocs(collection(db, userByEmailDoc));
    const users = querySnapshot.docs.map((doc) => ({
        email: doc.id,
        uid: doc.data().uid || '',
        nickname: doc.data().nickname,
        photoURL: doc.data().photoURL,
        ...doc.data(),
    }));
    return users;
};
