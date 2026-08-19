# Rule: Vercel Deployment Workflow

**Context:** Whenever the user asks to "deploy", "subir no vercel", or publish the application.

**Constraint:** Do NOT attempt to use the Vercel CLI (`npx vercel` or similar) to deploy the application manually.

**Correct Workflow:**
1. This project is linked to Vercel via Git integration.
2. To trigger a deployment, simply stage the changes, create a descriptive commit, and push to the remote repository.
3. Example:
   ```bash
   git add .
   git commit -m "feat: your descriptive message"
   git push origin main
   ```
4. Once pushed, Vercel will automatically mirror and deploy the update. Inform the user that the code has been pushed and Vercel is handling the deployment.
