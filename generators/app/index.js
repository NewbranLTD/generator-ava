'use strict';
const Generator = require('yeoman-generator');
const extend = require('deep-extend');
const rootPkg = require('../../package.json');

const JEST_ENV = ['jsdom', 'node'];

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    this.option('testEnv', {
      type: String,
      desc: 'Test environment (jsdom or node)'
    });

    this.option('nyc', {
      type: Boolean,
      desc: 'Add coverage reports using nyc'
    });
  }

  prompting() {
    var prompts = [
      {
        type: 'list',
        name: 'testEnv',
        message: 'What environment do you want to use',
        choices: JEST_ENV,
        default: this.options.testEnv,
        when: JEST_ENV.indexOf(this.options.testEnv) === -1
      },
      {
        type: 'confirm',
        name: 'nyc',
        message: 'Add coverage reports using nyc?',
        when: this.options.nyc === undefined
      }
    ];

    return this.prompt(prompts).then(props => {
      this.props = Object.assign(
        {
          testEnv: this.options.testEnv,
          nyc: this.options.nyc
        },
        props
      );
    });
  }

  writing() {
    let pkg = this.fs.readJSON(this.destinationPath('package.json'), {});
    pkg = extend(pkg, {
      scripts: {},
      devDependencies: {
        ava: rootPkg.devDependencies.ava
      }
    });
    /*
    ava: {
      collectCoverage: true,
      coverageDirectory: 'coverage'
    }
    */
    if (this.options.nyc) {
      pkg = extend(pkg, {
        devDependencies: {
          nyc: rootPkg.devDependencies.nyc
        }
      });
    }
    // Add jest to the npm test script in a non-destructive way
    var testScripts = pkg.scripts.test || '';
    testScripts = testScripts
      .split('&&')
      .map(str => str.trim())
      .filter(Boolean);
    if (!testScripts.find(script => script.startsWith('ava'))) {
      testScripts.push('ava');
      pkg.scripts.test = testScripts.join(' && ');
    }

    // Send coverage reports to nyc
    if (this.props.nyc) {
      pkg.scripts.posttest = 'cat ./coverage/lcov.info | nyc';
      pkg.devDependencies.nyc = rootPkg.devDependencies.nyc;
    }

    if (this.props.testEnv !== 'jsdom') {
      pkg.jest = {};
      pkg.jest.testEnv = this.props.testEnv;
    }

    this.fs.writeJSON(this.destinationPath('package.json'), pkg);
  }

  install() {
    this.installDependencies({ bower: false, npm: true });
  }
};
