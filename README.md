# End to End Cloud Engineering Project  

**Instalike** is a cloud-based project designed to demonstrate the application of key cloud engineering principles, automation, and modern DevOps practices. While the project features a social media automation application, the real focus is on showcasing various cloud engineering techniques, from infrastructure provisioning and deployment automation to monitoring and incident management.  

## Project Overview  

This project emphasizes the use of cloud-native technologies and modern DevOps practices to build, deploy, and operate an application in the cloud. The solution incorporates **infrastructure as code (IaC)**, **CI/CD automation**, **scalable cloud architectures**, and **incident response** through real-time monitoring and alerting services.  

### Key Cloud Engineering Concepts Demonstrated:  

- **Infrastructure as Code (IaC)**: The entire cloud infrastructure is provisioned and managed using **Terraform**. This includes configuring virtual networks, storage accounts, serverless functions, and other Azure resources. IaC ensures that the infrastructure is reproducible, scalable, and easily maintained.  
  
- **CI/CD Pipeline**: Automated deployment workflows are set up using **GitHub Actions** to manage the lifecycle of the application. This includes:  
  - **Continuous Integration (CI)**: Building and testing the application automatically on every change to the main branch. Also stores the artifact in blob storage with versioning.  
  - **Continuous Deployment (CD)**: Deploying the application to production seamlessly, ensuring that new features or bug fixes are delivered quickly with minimal downtime.  

- **Serverless Architecture**: The backend of the project leverages **Azure Functions**, a serverless compute service, to scale automatically based on demand. This eliminates the need to manage servers while ensuring high availability.  

- **Cloud Hosting with Azure Static Web Apps**: The frontend of the application is deployed on **Azure Static Web Apps**, providing a scalable, cost-efficient hosting solution for static websites. Static Web Apps also allows for a global audience with a built-in global CDN caching content at edge nodes.  

- **Monitoring & Incident Management**: The project integrates with **PagerDuty** to provide real-time alerts on operational issues. This ensures proactive monitoring of the system and enables fast response times to incidents, reducing downtime and improving overall service reliability.  

- **Scalability and Automation**: The system is designed to handle fluctuating workloads by using Azure’s serverless services and auto-scaling capabilities, ensuring that resources are allocated efficiently based on usage.  

## Technologies Used:  
- **Cloud Platform**: Microsoft Azure for hosting, compute, networking, storage, and database.  
- **Infrastructure as Code**: Terraform for provisioning Azure resources.  
- **CI/CD**: GitHub Actions for continuous integration and deployment automation.  
- **Serverless Computing**: Azure Functions for backend processing.  
- **Monitoring**: PagerDuty for real-time alerting and incident management.  
- **Operational Excellence**: By integrating real-time monitoring and incident management (via PagerDuty), the project demonstrates how to maintain high availability and reliability in production environments.  
