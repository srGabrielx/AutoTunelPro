import LandingPage from "../components/LandingPage";
import TauriRedirect from "../components/TauriRedirect";

export default function Home() {
  return (
    <TauriRedirect>
      <LandingPage />
    </TauriRedirect>
  );
}
