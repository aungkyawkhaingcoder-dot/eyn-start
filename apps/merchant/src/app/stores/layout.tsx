import { MerchantCache } from "../../components/MerchantCache";

export default function StoresLayout({ children }: { children: React.ReactNode }) {
  return <MerchantCache>{children}</MerchantCache>;
}
