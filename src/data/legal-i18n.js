/**
 * Legal page content (privacy policy, terms of use) — en/zh.
 * Each section body is an array of paragraphs so the client-side i18n
 * engine can switch them via data-i18n="page.sections.N.body.M".
 */
export const LEGAL_I18N = {
  en: {
    privacy: {
      title: 'Privacy Policy',
      lastUpdated: 'Last updated: August 2, 2026',
      intro:
        'This Privacy Policy explains how theme.electerm.org ("we", "us") collects, uses, and protects your information when you use our theme editor and sharing platform. By using the site, you agree to the practices described here.',
      sections: [
        {
          heading: 'Information We Collect',
          body: [
            'We use GitHub for authentication. When you sign in, we receive the profile information GitHub shares with us, which may include your GitHub username, display name, avatar, and user ID.',
            'The themes you create and choose to save are stored in our database together with your account. Each theme contains the color configuration you authored and a name you provide.',
            'We do not request and do not store your GitHub password. Authentication is handled entirely by GitHub through OAuth.'
          ]
        },
        {
          heading: 'How We Use Your Information',
          body: [
            'Your account information is used to identify you as the owner of the themes you save, to display your name on themes you publish publicly, and to personalize your profile.',
            'Aggregated, non-identifying statistics — such as the total number of themes, users, and likes — may be displayed on the site to highlight community activity.'
          ]
        },
        {
          heading: 'Public Themes',
          body: [
            'Themes you publish to the public gallery are visible to everyone. Your display name and avatar will be shown alongside themes you publish.',
            'Private (unpublished) themes are visible only to you when you are signed in.'
          ]
        },
        {
          heading: 'Cookies and Sessions',
          body: [
            'We use a session cookie to keep you signed in. This cookie is essential for authentication and is not used for cross-site tracking.',
            'Third-party advertising on this site is provided by EthicalAds, which may use cookies or local storage to measure ad performance. You can learn more at ethicalads.io.'
          ]
        },
        {
          heading: 'Data Retention',
          body: [
            'We keep your account and themes for as long as you use the service. You can delete individual themes at any time from your profile.',
            'To request deletion of your account and all associated data, contact us through the electerm.org contact page.'
          ]
        },
        {
          heading: 'Third-Party Services',
          body: [
            'This site relies on GitHub for authentication, Cloudflare for hosting and data storage, and EthicalAds for advertising. Each operates under its own privacy policy.'
          ]
        },
        {
          heading: 'Children’s Privacy',
          body: [
            'This service is not directed to children under 13. We do not knowingly collect information from children. If you believe a child has provided us with information, please contact us so we can delete it.'
          ]
        },
        {
          heading: 'Changes to This Policy',
          body: [
            'We may update this Privacy Policy from time to time. The "Last updated" date above reflects the most recent revision. Continued use of the site after changes constitutes acceptance of the updated policy.'
          ]
        },
        {
          heading: 'Contact',
          body: [
            'For privacy questions or requests, reach out via the electerm.org contact page or open an issue on our GitHub repository.'
          ]
        }
      ]
    },
    'terms-of-use': {
      title: 'Terms of Use',
      lastUpdated: 'Last updated: August 2, 2026',
      intro:
        'These Terms of Use govern your use of theme.electerm.org. By accessing the site or signing in, you agree to be bound by these terms. If you do not agree, please do not use the service.',
      sections: [
        {
          heading: 'Acceptance of Terms',
          body: [
            'By signing in with your GitHub account, you confirm that you accept these Terms and consent to the collection and use of information described in our Privacy Policy.'
          ]
        },
        {
          heading: 'Your Account',
          body: [
            'You are responsible for maintaining the security of your account through GitHub and for all activity that occurs under your account.',
            'You must provide accurate information and may not impersonate another person or entity.'
          ]
        },
        {
          heading: 'Your Content',
          body: [
            'You retain ownership of the themes you create. By publishing a theme to the public gallery, you grant others a license to view, copy, and use your theme configuration within electerm.',
            'You represent that the content you share does not infringe the rights of any third party.'
          ]
        },
        {
          heading: 'Acceptable Use',
          body: [
            'You agree not to misuse the service, including by attempting to access data you are not authorized to access, interfering with the service, or using automated means to abuse the platform.',
            'A reasonable limit (currently 10 themes per account) is enforced to keep the service sustainable for everyone.'
          ]
        },
        {
          heading: 'Themes Are Provided "As Is"',
          body: [
            'Theme configurations are user-generated content. We do not guarantee that any theme will function perfectly in every environment, and we are not liable for how a theme affects your terminal.'
          ]
        },
        {
          heading: 'Termination',
          body: [
            'You may stop using the service and delete your themes at any time. We may suspend or terminate access if we believe you have violated these Terms.'
          ]
        },
        {
          heading: 'Limitation of Liability',
          body: [
            'The service is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the site.'
          ]
        },
        {
          heading: 'Changes to These Terms',
          body: [
            'We may revise these Terms from time to time. The "Last updated" date reflects the latest version. Your continued use of the service after changes constitutes acceptance of the revised Terms.'
          ]
        },
        {
          heading: 'Contact',
          body: [
            'Questions about these Terms can be sent through the electerm.org contact page or raised as an issue on GitHub.'
          ]
        }
      ]
    }
  },
  zh: {
    privacy: {
      title: '隐私政策',
      lastUpdated: '最后更新：2026 年 8 月 2 日',
      intro:
        '本隐私政策说明 theme.electerm.org（"我们"）在使用我们的主题编辑器和分享平台时，如何收集、使用和保护您的信息。使用本站即表示您同意此处所述的做法。',
      sections: [
        {
          heading: '我们收集的信息',
          body: [
            '我们使用 GitHub 进行身份验证。当您登录时，我们会收到 GitHub 与我们共享的个人资料信息，其中可能包括您的 GitHub 用户名、显示名称、头像和用户 ID。',
            '您创建并选择保存的主题会与您的账户一起存储在我们的数据库中。每个主题包含您创作的颜色配置以及您提供的名称。',
            '我们不会索取也不会存储您的 GitHub 密码。身份验证完全通过 GitHub OAuth 完成。'
          ]
        },
        {
          heading: '我们如何使用您的信息',
          body: [
            '您的账户信息用于标识您是所保存主题的所有者、在您公开发布的主题上显示您的名称，以及个性化您的个人中心。',
            '汇总的非身份识别统计数据（如主题总数、用户总数和点赞总数）可能会在网站上展示，以呈现社区活跃度。'
          ]
        },
        {
          heading: '公开主题',
          body: [
            '您发布到公共广场的主题对所有人可见。您发布的主题旁会显示您的显示名称和头像。',
            '私有（未发布）的主题仅在您登录后对您本人可见。'
          ]
        },
        {
          heading: 'Cookie 和会话',
          body: [
            '我们使用会话 cookie 来保持您的登录状态。此 cookie 是身份验证所必需的，不会用于跨站跟踪。',
            '本站的第三方广告由 EthicalAds 提供，它可能使用 cookie 或本地存储来衡量广告效果。详情请见 ethicalads.io。'
          ]
        },
        {
          heading: '数据保留',
          body: [
            '只要您使用本服务，我们就会保留您的账户和主题。您可以随时在个人中心删除单个主题。',
            '如需删除您的账户及所有相关数据，请通过 electerm.org 的联系页面与我们联系。'
          ]
        },
        {
          heading: '第三方服务',
          body: [
            '本站依赖 GitHub 进行身份验证，依赖 Cloudflare 进行托管和数据存储，并依赖 EthicalAds 提供广告。各服务均遵循其各自的隐私政策。'
          ]
        },
        {
          heading: '儿童隐私',
          body: [
            '本服务不面向 13 岁以下的儿童。我们不会故意收集儿童的信息。如果您认为有儿童向我们提供了信息，请联系我们以便我们将其删除。'
          ]
        },
        {
          heading: '本政策的变更',
          body: [
            '我们可能会不时更新本隐私政策。上方的"最后更新"日期反映了最近的修订。在变更后继续使用本站即表示接受更新后的政策。'
          ]
        },
        {
          heading: '联系方式',
          body: [
            '如有隐私问题或请求，请通过 electerm.org 的联系页面联系我们，或在我们的 GitHub 仓库中提交 issue。'
          ]
        }
      ]
    },
    'terms-of-use': {
      title: '使用条款',
      lastUpdated: '最后更新：2026 年 8 月 2 日',
      intro:
        '本使用条款约束您对 theme.electerm.org 的使用。访问本站或登录即表示您同意受这些条款约束。如果您不同意，请勿使用本服务。',
      sections: [
        {
          heading: '条款的接受',
          body: [
            '使用 GitHub 账户登录即表示您确认接受本条款，并同意按我们的隐私政策所述收集和使用信息。'
          ]
        },
        {
          heading: '您的账户',
          body: [
            '您有责任通过 GitHub 维护账户安全，并对您账户下发生的所有活动负责。',
            '您必须提供准确的信息，且不得冒充其他个人或实体。'
          ]
        },
        {
          heading: '您的内容',
          body: [
            '您保留所创建主题的所有权。将主题发布到公共广场即表示您授予他人查看、复制和在 electerm 中使用您主题配置的权利。',
            '您声明您分享的内容不会侵犯任何第三方的权利。'
          ]
        },
        {
          heading: '可接受的使用',
          body: [
            '您同意不滥用本服务，包括不试图访问您无权访问的数据、不干扰本服务，或不使用自动化手段滥用平台。',
            '为保证服务的可持续性，我们设置了合理的限制（目前每个账户 10 个主题）。'
          ]
        },
        {
          heading: '主题按"现状"提供',
          body: [
            '主题配置是用户生成的内容。我们不保证任何主题在所有环境中都能完美运行，对于主题对您终端造成的影响也不承担责任。'
          ]
        },
        {
          heading: '终止',
          body: [
            '您可以随时停止使用本服务并删除您的主题。如果我们认为您违反了本条款，可能会暂停或终止您的访问权限。'
          ]
        },
        {
          heading: '责任限制',
          body: [
            '本服务按"现状"和"可用"基础提供。在法律允许的最大范围内，对于因您使用本站而产生的任何间接、附带或后果性损害，我们不承担责任。'
          ]
        },
        {
          heading: '条款的变更',
          body: [
            '我们可能会不时修订本条款。"最后更新"日期反映最新版本。在变更后继续使用本服务即表示接受修订后的条款。'
          ]
        },
        {
          heading: '联系方式',
          body: [
            '有关本条款的问题可通过 electerm.org 的联系页面发送，或在 GitHub 上提交 issue。'
          ]
        }
      ]
    }
  }
}
