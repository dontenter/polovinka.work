import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 async headers(){return [{source:"/brazil-history-bridge",headers:[
  {key:"Content-Security-Policy",value:"frame-ancestors https://polovinka.work https://www.polovinka.work"},
  {key:"Cache-Control",value:"no-store"},{key:"X-Robots-Tag",value:"noindex, nofollow"},{key:"Referrer-Policy",value:"no-referrer"}
 ]}];}
};

export default nextConfig;
