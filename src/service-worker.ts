import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import {NavigationRoute, registerRoute} from 'workbox-routing';
import { skipWaiting, clientsClaim } from "workbox-core"

skipWaiting();
clientsClaim();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: __WB_MANIFEST is a placeholder filled by workbox-webpack-plugin with the list of dependecies to be cached
precacheAndRoute(self.__WB_MANIFEST)
const handler = createHandlerBoundToURL("/index.html");
const navigationRoute = new NavigationRoute(handler);
registerRoute(navigationRoute);
