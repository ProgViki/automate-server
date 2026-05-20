import { MailerOptions, TemplateAdapter } from '@nestjs-modules/mailer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

type PartialsOptions = {
  dir: string;
};

type RuntimeOptions = {
  partials?: false | PartialsOptions;
  data?: Record<string, any>;
};

export class CustomHandlebarsAdapter implements TemplateAdapter {
  private readonly precompiledTemplates: Record<
    string,
    HandlebarsTemplateDelegate
  > = {};

  constructor(helpers?: Record<string, Handlebars.HelperDelegate>) {
    handlebars.registerHelper('concat', (...args: unknown[]) => {
      args.pop();
      return args.join('');
    });
    handlebars.registerHelper('isEven', (n: number) => n % 2 === 0);
    if (helpers) {
      handlebars.registerHelper(helpers);
    }
  }

  compile(
    mail: any,
    callback: (err?: any, body?: string) => any,
    mailerOptions: MailerOptions,
  ): void {
    const templateOptions = (mailerOptions as any).template || {};
    const templateBaseDir = templateOptions.dir || '';
    const template = mail?.data?.template;

    if (!template) {
      callback(new Error('Template is not defined'));
      return;
    }

    const templateExt = path.extname(template) || '.hbs';
    let templateName = path.basename(template, path.extname(template));
    const templateDir = path.isAbsolute(template)
      ? path.dirname(template)
      : path.join(templateBaseDir, path.dirname(template));
    const templatePath = path.join(templateDir, templateName + templateExt);
    templateName = path
      .relative(templateBaseDir || templateDir, templatePath)
      .replace(templateExt, '');

    if (!this.precompiledTemplates[templateName]) {
      try {
        const source = fs.readFileSync(templatePath, 'utf8');
        this.precompiledTemplates[templateName] = handlebars.compile(
          source,
          templateOptions.options || {},
        );
      } catch (err) {
        callback(err);
        return;
      }
    }

    const runtimeOptions: RuntimeOptions = (mailerOptions as any).options || {};

    if (runtimeOptions.partials && runtimeOptions.partials.dir) {
      this.registerPartials(runtimeOptions.partials.dir);
    }

    const renderOptions = {
      ...(runtimeOptions as any),
    } as Handlebars.RuntimeOptions;

    if (
      (renderOptions as any).partials === false ||
      ((renderOptions as any).partials &&
        (renderOptions as any).partials.dir)
    ) {
      delete (renderOptions as any).partials;
    }

    try {
      const rendered = this.precompiledTemplates[templateName](
        mail?.data?.context,
        renderOptions,
      );
      mail.data.html = rendered;
      callback();
    } catch (err) {
      callback(err);
    }
  }

  private registerPartials(partialsDir: string): void {
    if (!fs.existsSync(partialsDir)) {
      return;
    }

    const files = this.walkDir(partialsDir);
    for (const file of files) {
      if (path.extname(file) !== '.hbs') {
        continue;
      }
      const name = path
        .relative(partialsDir, file)
        .replace(/\\/g, '/')
        .replace(/\.hbs$/, '');
      try {
        const source = fs.readFileSync(file, 'utf8');
        handlebars.registerPartial(name, source);
      } catch {
        // Ignore bad partials; compile will surface missing partials later
      }
    }
  }

  private walkDir(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.walkDir(fullPath));
      } else {
        results.push(fullPath);
      }
    }
    return results;
  }
}
