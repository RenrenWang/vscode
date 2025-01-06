CREATE PROCEDURE debug_example()
BEGIN
    --debug
    INSERT INTO table_name (`create_time`, `name`)   VALUES (1, 'value2');

    -- Second debug point: inserting another row into table_name
    --debug
    INSERT INTO table_name (`create_time`, `name`)  VALUES (2, 'value4');

    -- Third debug point: inserting data with different values
    --debug
    INSERT INTO table_name (`create_time`, `name`) VALUES (4, 'value6');

    -- Final query to retrieve the data inserted above
    --debug
    SELECT * FROM table_name LIMIT 100;
END;
