module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      options: {
        browser: true,
        shadow: true,
        '-W024': true,
        ignores: [
          'src/workerBuild.js' // because of brfs
        ]
      },
      all: [
        '*.js',
        'lib/*.js',
        'static-assets/*.js',
        'src/**/*.js'
      ]
    },
    browserify: {
      main: {
        src: 'src/main.js',
        dest: 'live/main.js',
        options: {
          transform: ['brfs'],
          debug: true
        }
      },
      worker: {
        src: 'src/worker.js',
        dest: 'src/workerBuild.js', // because of brfs
        options: {
          debug: true
        }
      }
    },
    copy: {
      main: {
        files: [
          {
            expand: true,
            flatten: true,
            src: ['static-assets/*'],
            dest: 'live/',
            filter: 'isFile'
          }
        ]
      }
    },
    watch: {
      scripts: {
        files: ['src/**/*.js',
                '!src/workerBuild.js'],
        tasks: ['jshint',
                'browserify',
                'copy']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');


  grunt.registerTask('default', ['jshint',
                                 'browserify:worker',
                                 'copy',
                                 'browserify:main']);

};
