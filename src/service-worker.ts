import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import {CacheFirst} from "workbox-strategies";
import {NavigationRoute, registerRoute} from 'workbox-routing';
import { clientsClaim } from "workbox-core";
import {CacheableResponsePlugin} from "workbox-cacheable-response";
declare let self: ServiceWorkerGlobalScope;
self.skipWaiting()
clientsClaim();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: __WB_MANIFEST is a placeholder filled by workbox-webpack-plugin with the list of dependecies to be cached
precacheAndRoute(self.__WB_MANIFEST);
const handler = createHandlerBoundToURL("/index.html");
const navigationRoute = new NavigationRoute(handler);
registerRoute(navigationRoute);
registerRoute(({url}) => url.origin === "https://dynamodb.ap-southeast-2.amazonaws.com/",
              new CacheFirst({cacheName: "db-cache", 
                             plugins: [ new CacheableResponsePlugin({statuses: [0,200]})]}) )

