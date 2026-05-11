import ImageKit from "imagekit";
import {
  IMAGEKIT_PRIVATE_KEY,
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
} from "./env.js";

const imageKit = new ImageKit({
  publicKey: IMAGEKIT_PUBLIC_KEY!,
  privateKey: IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: IMAGEKIT_URL_ENDPOINT!,
});

export { imageKit };
